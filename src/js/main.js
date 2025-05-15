const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { getAutoFirmaPath } = require('./signature');

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
        console.log('XML original leído correctamente');
        
        // Limpiar firma anterior si existe
        let xmlSinFirma = xmlData;
        const firmaRegex = /<ds:Signature[\s\S]*?<\/ds:Signature>/g;
        if (firmaRegex.test(xmlData)) {
            console.log('Firma anterior encontrada, eliminándola...');
            xmlSinFirma = xmlData.replace(firmaRegex, '');
            console.log('Firma anterior eliminada');
        } else {
            console.log('No se encontró firma anterior');
        }
        
        // Encontrar y reemplazar solo el InvoiceNumber
        const invoiceNumberRegex = /<InvoiceNumber>([^<]+)<\/InvoiceNumber>/;
        const seriesCodeMatch = xmlSinFirma.match(/<InvoiceSeriesCode>([^<]+)<\/InvoiceSeriesCode>/);
        
        if (seriesCodeMatch) {
            const seriesCode = seriesCodeMatch[1];
            const xmlModificado = xmlSinFirma.replace(invoiceNumberRegex, `<InvoiceNumber>${seriesCode}</InvoiceNumber>`);
            console.log('InvoiceNumber modificado correctamente');
        
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
            
            // Guardar el XML modificado
            fs.writeFileSync(outputPath, xmlModificado);
            console.log('XML guardado en:', outputPath);

            // Si se seleccionó certificado de Windows, abrir AutoFirma GUI
            if (certPath === 'windows') {
                try {
                    // Intentar diferentes rutas posibles de AutoFirma
                    const posiblesRutas = [
                        'C:\\Program Files\\AutoFirma\\AutoFirma.exe',
                        'C:\\Program Files (x86)\\AutoFirma\\AutoFirma.exe',
                        'C:\\Program Files\\AutoFirma\\AutoFirma\\AutoFirma.exe',
                        'C:\\Program Files (x86)\\AutoFirma\\AutoFirma\\AutoFirma.exe'
                    ];

                    let autofirmaPath = null;
                    for (const ruta of posiblesRutas) {
                        if (fs.existsSync(ruta)) {
                            autofirmaPath = ruta;
                            console.log('AutoFirma encontrado en:', ruta);
                            break;
                        }
                    }

                    if (!autofirmaPath) {
                        throw new Error('No se encontró AutoFirma en las rutas habituales');
                    }

                    // Enviar el archivo al proceso principal para mostrarlo
                    const mainWindow = BrowserWindow.getAllWindows()[0];
                    mainWindow.webContents.send('show-file-preview', {
                        filePath: outputPath,
                        fileName: nuevoNombre
                    });

                    // Esperar un momento para asegurar que la vista previa se muestra
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Comprobar si AutoFirma ya está abierto
                    const isAutoFirmaRunning = () => {
                        try {
                            const { execSync } = require('child_process');
                            const output = execSync('tasklist', { encoding: 'utf8' });
                            return output.toLowerCase().includes('autofirma.exe');
                        } catch (e) {
                            return false;
                        }
                    };

                    if (!isAutoFirmaRunning()) {
                        // Abrir AutoFirma usando spawn
                        const { spawn } = require('child_process');
                        console.log('Abriendo AutoFirma...');
                        const autofirmaProcess = spawn(autofirmaPath, [], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        autofirmaProcess.unref();
                    } else {
                        console.log('AutoFirma ya está abierto, no se vuelve a lanzar.');
                    }

                    return { 
                        success: true, 
                        newFileName: nuevoNombre,
                        outputPath: outputPath,
                        autofirmaGui: true
                    };
                } catch (error) {
                    console.error('Error al abrir AutoFirma:', error);
                    throw new Error(`Error al abrir AutoFirma: ${error.message}`);
                }
            }

            // Si no es certificado de Windows, solo devolver el XML modificado
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

// Manejar la apertura de la ubicación del archivo
ipcMain.handle('open-file-location', async (event, filePath) => {
    try {
        const { shell } = require('electron');
        const path = require('path');
        const folderPath = path.dirname(filePath);
        await shell.openPath(folderPath);
    } catch (error) {
        console.error('Error al abrir la ubicación del archivo:', error);
    }
}); 