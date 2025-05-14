const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const FacturaeSigner = require('./signature');

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        transparent: true,
        resizable: false,
        icon: path.join(__dirname, '../assets/icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile(path.join(__dirname, '../index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Manejar la selección de archivo
ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'XML Files', extensions: ['xml'] }
        ]
    });
    
    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});

// Manejar la selección de carpeta de destino
ipcMain.handle('select-output-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    
    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});

// Manejar la selección del certificado
ipcMain.handle('select-certificate', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Certificados', extensions: ['p12', 'pfx'] }
        ]
    });
    
    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});

// Procesar el archivo XML
ipcMain.handle('process-xml', async (event, filePath, outputFolder, outputFileName, certPath, certPassword, windowsCertSerial) => {
    try {
        const xmlData = fs.readFileSync(filePath, 'utf8');
        
        // Encontrar y reemplazar solo el InvoiceNumber
        const invoiceNumberRegex = /<InvoiceNumber>([^<]+)<\/InvoiceNumber>/;
        const seriesCodeMatch = xmlData.match(/<InvoiceSeriesCode>([^<]+)<\/InvoiceSeriesCode>/);
        
        if (seriesCodeMatch) {
            const seriesCode = seriesCodeMatch[1];
            const xmlModificado = xmlData.replace(invoiceNumberRegex, `<InvoiceNumber>${seriesCode}</InvoiceNumber>`);
            
            let nuevoNombre = null;
            if (outputFileName && outputFileName.length > 0) {
                nuevoNombre = outputFileName.endsWith('.xml') ? outputFileName : `${outputFileName}.xml`;
            } else {
                const nombreArchivo = path.basename(filePath);
                const nombreSinExtension = path.parse(nombreArchivo).name;
                nuevoNombre = `${nombreSinExtension}_holded.xml`;
            }
            
            const outputPath = outputFolder ? 
                path.join(outputFolder, nuevoNombre) : 
                path.join(path.dirname(filePath), nuevoNombre);

            // Si se proporcionó un certificado, re-firmar el XML
            if (certPath && (certPassword || windowsCertSerial)) {
                const signer = new FacturaeSigner();
                let cert, privateKey;
                if (certPath === 'windows') {
                    cert = await signer.loadCertificate('windows', windowsCertSerial);
                    privateKey = null;
                } else {
                    cert = await signer.loadCertificate(certPath);
                    privateKey = await signer.loadPrivateKey(certPath, certPassword);
                }
                const xmlFirmado = await signer.signXML(xmlModificado, cert, privateKey);
                fs.writeFileSync(outputPath, xmlFirmado);
            } else {
                fs.writeFileSync(outputPath, xmlModificado);
            }

            return { 
                success: true, 
                newFileName: nuevoNombre,
                outputPath: outputPath
            };
        } else {
            throw new Error('No se encontró el código de serie en el XML');
        }
    } catch (error) {
        console.error('Error al procesar el XML:', error);
        return { success: false, error: error.message };
    }
});

// Handler para obtener la lista de certificados de Windows
ipcMain.handle('get-windows-certificates', async () => {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    try {
        console.log('Ejecutando certutil para listar certificados...');
        const { stdout, stderr } = await execPromise('certutil -user -store My', { encoding: 'latin1' });
        if (stderr) console.error('Error de certutil:', stderr);

        const certs = [];
        // Dividir la salida por certificados
        const certBlocks = stdout.split('================ Certificado');
        
        certBlocks.forEach((block, index) => {
            // Extraer número de serie (insensible a mayúsculas y espacios)
            const serialMatch = block.match(/número de serie:\s*([A-Fa-f0-9]+)/i);
            const serialNumber = serialMatch ? serialMatch[1].trim() : null;
            
            // Extraer emisor
            const issuerLine = block.split('\n').find(line => 
                line.trim().toLowerCase().startsWith('emisor:')
            );
            const issuer = issuerLine ? issuerLine.split(':')[1].trim() : null;
            
            // Extraer sujeto
            const subjectLine = block.split('\n').find(line => 
                line.trim().toLowerCase().startsWith('sujeto:')
            );
            const subject = subjectLine ? subjectLine.split(':')[1].trim() : null;
            
            if (serialNumber && issuer && subject) {
                const cert = {
                    serialNumber,
                    issuer,
                    subject
                };
                console.log('Añadiendo certificado:', cert);
                certs.push(cert);
            } else {
                if (!serialNumber) console.log('No se pudo extraer el número de serie');
                if (!issuer) console.log('No se pudo extraer el emisor');
                if (!subject) console.log('No se pudo extraer el sujeto');
            }
        });

        console.log('Certificados encontrados:', certs);
        return certs;
    } catch (error) {
        console.error('Error al ejecutar certutil:', error);
        return [];
    }
}); 