const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

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

// Procesar el archivo XML
ipcMain.handle('process-xml', async (event, filePath, outputFolder, outputFileName) => {
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
                // Asegurarse de que termina en .xml
                nuevoNombre = outputFileName.endsWith('.xml') ? outputFileName : `${outputFileName}.xml`;
            } else {
                const nombreArchivo = path.basename(filePath);
                const nombreSinExtension = path.parse(nombreArchivo).name;
                nuevoNombre = `${nombreSinExtension}_holded.xml`;
            }
            
            // Usar la carpeta de destino si se especificó, sino usar la misma carpeta del archivo original
            const outputPath = outputFolder ? 
                path.join(outputFolder, nuevoNombre) : 
                path.join(path.dirname(filePath), nuevoNombre);
            
            fs.writeFileSync(outputPath, xmlModificado);
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