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
        icon: path.join(__dirname, '../assets/icon.png'),
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
        
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            preserveOrder: true,
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true,
            processEntities: true,
            format: true,
            declaration: true,
            isArray: (name, jpath, isLeafNode, isAttribute) => {
                return false;
            }
        });
        
        const resultado = parser.parse(xmlData);
        
        // Función recursiva para encontrar y modificar InvoiceNumber
        function modificarInvoiceNumberPO(obj) {
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    modificarInvoiceNumberPO(item);
                }
            } else if (typeof obj === 'object' && obj !== null) {
                // Buscar InvoiceHeader
                if (obj.hasOwnProperty('InvoiceHeader')) {
                    let seriesCode = null;
                    let invoiceNumberKey = null;
                    // Buscar InvoiceSeriesCode e InvoiceNumber
                    for (const headerItem of obj.InvoiceHeader) {
                        if (headerItem.hasOwnProperty('InvoiceSeriesCode')) {
                            // Puede ser array o string
                            if (Array.isArray(headerItem.InvoiceSeriesCode)) {
                                seriesCode = headerItem.InvoiceSeriesCode[0]['#text'] || headerItem.InvoiceSeriesCode[0];
                            } else {
                                seriesCode = headerItem.InvoiceSeriesCode;
                            }
                        }
                        if (headerItem.hasOwnProperty('InvoiceNumber')) {
                            invoiceNumberKey = headerItem;
                        }
                    }
                    // Modificar InvoiceNumber si ambos existen
                    if (seriesCode && invoiceNumberKey) {
                        invoiceNumberKey.InvoiceNumber = [{ '#text': seriesCode }];
                        console.log('InvoiceNumber modificado a:', seriesCode);
                    }
                }
                // Recursividad para el resto de claves
                for (const key in obj) {
                    modificarInvoiceNumberPO(obj[key]);
                }
            }
        }
        modificarInvoiceNumberPO(resultado);
        
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            preserveOrder: true,
            format: true,
            indentBy: "  ",
            suppressBooleanAttributes: false,
            processEntities: true,
            declaration: true,
            declarationOptions: {
                version: '1.0',
                encoding: 'UTF-8'
            }
        });
        
        let xmlModificado = builder.build(resultado);
        // Forzar la declaración correcta
        xmlModificado = xmlModificado.replace(/<\?xml version="1" encoding="UTF-8"\?>/, '<?xml version="1.0" encoding="UTF-8"?>');
        // Corregir los namespaces
        xmlModificado = xmlModificado.replace('<fe:Facturae>', '<fe:Facturae xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');
        xmlModificado = xmlModificado.replace(/<xmlns:ds>.*?<\/xmlns:ds>/g, '');
        xmlModificado = xmlModificado.replace(/<xmlns:fe>.*?<\/xmlns:fe>/g, '');
        xmlModificado = xmlModificado.replace(/<xmlns:xsi>.*?<\/xmlns:xsi>/g, '');
        
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
    } catch (error) {
        console.error('Error al procesar el XML:', error);
        return { success: false, error: error.message };
    }
}); 