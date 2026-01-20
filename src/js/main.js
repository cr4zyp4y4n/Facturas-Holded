const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { getAutoFirmaPath, FacturaeSigner } = require('./signature');

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
    console.log('[MAIN] process-xml llamado con:', {
        filePath,
        outputFolder,
        outputFileName,
        certPath,
        windowsCertSerial
    });
    try {
        if (!filePath || !fs.existsSync(filePath)) {
            console.error('[MAIN] Archivo no encontrado:', filePath);
            return { success: false, error: 'El archivo no existe o no se proporcionó una ruta válida' };
        }
        
        const xmlData = fs.readFileSync(filePath, 'utf8');
        console.log('[MAIN] XML original leído correctamente, tamaño:', xmlData.length, 'caracteres');
        
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
            console.log('[MAIN] Código de serie encontrado:', seriesCode);
            const xmlModificado = xmlSinFirma.replace(invoiceNumberRegex, `<InvoiceNumber>${seriesCode}</InvoiceNumber>`);
            console.log('[MAIN] InvoiceNumber modificado correctamente');
        
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
            
            // Asegurar que el directorio de destino existe
            const outputDir = path.dirname(outputPath);
            console.log('[MAIN] Directorio de destino:', outputDir);
            if (!fs.existsSync(outputDir)) {
                console.log('[MAIN] El directorio no existe, creándolo...');
                fs.mkdirSync(outputDir, { recursive: true });
                console.log('[MAIN] Directorio creado correctamente');
            }
            
            // PRIMERO: Guardar el XML procesado (sin firma) en la ubicación final
            console.log('[MAIN] Guardando XML procesado en:', outputPath);
            console.log('[MAIN] Tamaño del XML a guardar:', xmlModificado.length, 'caracteres');
            try {
                fs.writeFileSync(outputPath, xmlModificado, 'utf8');
                console.log('[MAIN] Archivo escrito, verificando que existe...');
                
                // Verificar que el archivo realmente se guardó
                if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    console.log('[MAIN] ✓ Archivo guardado correctamente');
                    console.log('[MAIN] ✓ Tamaño del archivo guardado:', stats.size, 'bytes');
                    console.log('[MAIN] ✓ Ruta completa:', outputPath);
                } else {
                    console.error('[MAIN] ✗ ERROR: El archivo NO existe después de escribirlo');
                    throw new Error('El archivo no se pudo guardar. Verifica los permisos de escritura.');
                }
            } catch (writeError) {
                console.error('[MAIN] ✗ ERROR al escribir el archivo:', writeError);
                console.error('[MAIN] ✗ Stack:', writeError.stack);
                throw new Error(`Error al guardar el archivo: ${writeError.message}`);
            }
            
            // Si se seleccionó certificado de Windows, intentar firmar directamente
            if (certPath && certPath === 'windows' && windowsCertSerial) {
                try {
                    console.log('[MAIN] Intentando firmar XML con certificado de Windows:', windowsCertSerial);
                    console.log('[MAIN] NOTA: El archivo procesado ya está guardado en:', outputPath);
                    
                    // Crear instancia del firmador
                    const signer = new FacturaeSigner();
                    
                    // Cargar el certificado de Windows
                    console.log('[MAIN] Cargando certificado de Windows...');
                    let cert;
                    try {
                        cert = await signer.loadCertificate('windows', windowsCertSerial);
                        console.log('[MAIN] Certificado cargado:', cert.serialNumber);
                    } catch (certError) {
                        console.error('[MAIN] Error al cargar certificado:', certError);
                        // Si falla la carga del certificado, devolver el archivo procesado sin firmar
                        const mainWindow = BrowserWindow.getAllWindows()[0];
                        mainWindow.webContents.send('show-file-preview', {
                            filePath: outputPath,
                            fileName: nuevoNombre,
                            message: 'Archivo procesado guardado. Error al cargar el certificado, el archivo no está firmado.'
                        });
                        return {
                            success: true,
                            newFileName: nuevoNombre,
                            outputPath: outputPath,
                            warning: `Error al cargar el certificado: ${certError.message}. El archivo se guardó sin firmar.`
                        };
                    }
                    
                    // Cargar la clave privada (para Windows, será null pero el sistema la manejará)
                    const privateKey = await signer.loadPrivateKey('windows', '');
                    console.log('[MAIN] Clave privada cargada (Windows maneja esto internamente)');
                    
                    // Firmar el XML
                    console.log('[MAIN] Firmando XML...');
                    const xmlFirmado = await signer.signXML(xmlModificado, cert, privateKey);
                    
                    // Si la firma devuelve un mensaje especial de AutoFirma, usar el flujo anterior
                    if (xmlFirmado && xmlFirmado.startsWith('__AUTOFIRMA_GUI__:')) {
                        console.log('[MAIN] Se requiere AutoFirma GUI para certificados de Windows (clave privada protegida)');
                        const tempPath = xmlFirmado.replace('__AUTOFIRMA_GUI__:', '');
                        const autofirmaPath = await getAutoFirmaPath();
                        
                        console.log('[MAIN] Archivo procesado guardado en:', outputPath);
                        console.log('[MAIN] Archivo temporal para AutoFirma:', tempPath);
                        console.log('[MAIN] Certificado seleccionado:', windowsCertSerial);
                        
                        // Mostrar el archivo FINAL guardado (no el temporal)
                        const mainWindow = BrowserWindow.getAllWindows()[0];
                        mainWindow.webContents.send('show-file-preview', {
                            filePath: outputPath,
                            fileName: nuevoNombre,
                            message: 'El archivo está guardado y listo para firmar. AutoFirma se abrirá automáticamente. Por favor, selecciona el certificado y firma el documento.'
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Abrir AutoFirma con el archivo TEMPORAL como parámetro (AutoFirma lo firmará)
                        const { spawn } = require('child_process');
                        console.log('[MAIN] Ejecutando AutoFirma con archivo temporal:', tempPath);
                        const autofirmaProcess = spawn(autofirmaPath, [tempPath], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        autofirmaProcess.unref();
                        
                        return { 
                            success: true, 
                            newFileName: nuevoNombre,
                            outputPath: outputPath,  // Devolver el path REAL donde está guardado
                            autofirmaGui: true,
                            message: 'Archivo guardado correctamente. Por favor, usa AutoFirma para completar la firma con tu certificado de Windows.'
                        };
                    }
                    
                    // Si se firmó correctamente, guardar el XML firmado (sobrescribir el que ya guardamos)
                    console.log('[MAIN] XML firmado correctamente, guardando...');
                    try {
                        fs.writeFileSync(outputPath, xmlFirmado, 'utf8');
                        if (fs.existsSync(outputPath)) {
                            const stats = fs.statSync(outputPath);
                            console.log('[MAIN] ✓ XML firmado guardado correctamente');
                            console.log('[MAIN] ✓ Tamaño del archivo firmado:', stats.size, 'bytes');
                            console.log('[MAIN] ✓ Ruta completa:', outputPath);
                        } else {
                            throw new Error('El archivo firmado no se pudo guardar');
                        }
                    } catch (writeError) {
                        console.error('[MAIN] ✗ ERROR al escribir el archivo firmado:', writeError);
                        throw writeError;
                    }
                    
                    // Mostrar el archivo firmado
                    const mainWindow = BrowserWindow.getAllWindows()[0];
                    mainWindow.webContents.send('show-file-preview', {
                        filePath: outputPath,
                        fileName: nuevoNombre
                    });
                    
                    return { 
                        success: true, 
                        newFileName: nuevoNombre,
                        outputPath: outputPath,
                        signed: true
                    };
                } catch (error) {
                    console.error('[MAIN] Error al firmar con certificado de Windows:', error);
                    console.error('[MAIN] Stack:', error.stack);
                    // Si falla la firma directa, el archivo ya está guardado, solo abrir AutoFirma
                    console.log('[MAIN] Error al firmar, pero el archivo procesado ya está guardado en:', outputPath);
                    console.log('[MAIN] Intentando abrir AutoFirma como fallback...');
                    try {
                        // Crear archivo temporal para AutoFirma
                        const tempDir = path.join(app.getPath('temp'), 'facturae-xml');
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }
                        const tempPath = path.join(tempDir, `facturae_input_${Date.now()}.xml`);
                        fs.writeFileSync(tempPath, xmlModificado);
                        
                        const autofirmaPath = await getAutoFirmaPath();
                        const mainWindow = BrowserWindow.getAllWindows()[0];
                        mainWindow.webContents.send('show-file-preview', {
                            filePath: outputPath,
                            fileName: nuevoNombre,
                            message: 'Archivo guardado correctamente. AutoFirma se abrirá para que puedas firmarlo.'
                        });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const { spawn } = require('child_process');
                        const autofirmaProcess = spawn(autofirmaPath, [tempPath], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        autofirmaProcess.unref();
                        return { 
                            success: true, 
                            newFileName: nuevoNombre,
                            outputPath: outputPath,
                            autofirmaGui: true,
                            warning: 'No se pudo firmar directamente, usando AutoFirma: ' + error.message
                        };
                    } catch (autofirmaError) {
                        // Aunque falle AutoFirma, el archivo ya está guardado
                        console.log('[MAIN] Error al abrir AutoFirma, pero el archivo está guardado en:', outputPath);
                        return {
                            success: true,
                            newFileName: nuevoNombre,
                            outputPath: outputPath,
                            warning: 'Archivo guardado pero no se pudo abrir AutoFirma. Puedes firmarlo manualmente.'
                        };
                    }
                }
            }
            
            // Si se seleccionó certificado de archivo, intentar firmar
            if (certPath && certPath !== 'windows' && certPassword) {
                try {
                    console.log('[MAIN] Intentando firmar XML con certificado de archivo...');
                    const signer = new FacturaeSigner();
                    const cert = await signer.loadCertificate(certPath, null);
                    const privateKey = await signer.loadPrivateKey(certPath, certPassword);
                    const xmlFirmado = await signer.signXML(xmlModificado, cert, privateKey);
                    
                    // Asegurar que el directorio existe
                    const outputDir = path.dirname(outputPath);
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    
                    try {
                        fs.writeFileSync(outputPath, xmlFirmado, 'utf8');
                        if (fs.existsSync(outputPath)) {
                            const stats = fs.statSync(outputPath);
                            console.log('[MAIN] ✓ XML firmado guardado correctamente');
                            console.log('[MAIN] ✓ Tamaño del archivo firmado:', stats.size, 'bytes');
                            console.log('[MAIN] ✓ Ruta completa:', outputPath);
                        } else {
                            throw new Error('El archivo firmado no se pudo guardar');
                        }
                    } catch (writeError) {
                        console.error('[MAIN] ✗ ERROR al escribir el archivo firmado:', writeError);
                        throw new Error(`Error al guardar el archivo firmado: ${writeError.message}`);
                    }
                    
                    const mainWindow = BrowserWindow.getAllWindows()[0];
                    mainWindow.webContents.send('show-file-preview', {
                        filePath: outputPath,
                        fileName: nuevoNombre
                    });
                    
                    return { 
                        success: true, 
                        newFileName: nuevoNombre,
                        outputPath: outputPath,
                        signed: true
                    };
                } catch (error) {
                    console.error('[MAIN] Error al firmar con certificado de archivo:', error);
                    throw new Error(`Error al firmar: ${error.message}`);
                }
            }
            
            // Si no hay certificado, el XML ya está guardado arriba
            console.log('[MAIN] No se seleccionó certificado - solo se modificó el XML');
            console.log('[MAIN] XML procesado guardado en:', outputPath);
            
            // Verificar que el archivo existe antes de devolverlo
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('[MAIN] ✓ Archivo sin firma guardado correctamente');
                console.log('[MAIN] ✓ Tamaño:', stats.size, 'bytes');
            } else {
                console.error('[MAIN] ✗ ERROR: El archivo no existe después de guardarlo');
            }
            
            // Mostrar el archivo en la vista previa
            const mainWindow = BrowserWindow.getAllWindows()[0];
            mainWindow.webContents.send('show-file-preview', {
                filePath: outputPath,
                fileName: nuevoNombre
            });

            // Devolver el XML modificado (sin firma)
            return { 
                success: true, 
                newFileName: nuevoNombre,
                outputPath: outputPath,
                message: 'Archivo procesado correctamente (sin firmar).'
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
    console.log('[MAIN] ========== get-windows-certificates INVOCADO ==========');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    console.log('[MAIN] get-windows-certificates llamado');
    try {
        console.log('[MAIN] Ejecutando certutil para listar certificados...');
        console.log('[MAIN] Comando: certutil -user -store My');
        // Intentar con diferentes codificaciones y formatos
        let stdout = '';
        let stderr = '';
        
        try {
            const result = await execPromise('certutil -user -store My', { 
                encoding: 'latin1',
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });
            stdout = result.stdout || '';
            stderr = result.stderr || '';
        } catch (e) {
            // Si falla, intentar con utf8
            try {
                const result = await execPromise('certutil -user -store My', { 
                    encoding: 'utf8',
                    maxBuffer: 10 * 1024 * 1024
                });
                stdout = result.stdout || '';
                stderr = result.stderr || '';
            } catch (e2) {
                console.error('Error al ejecutar certutil:', e2);
                throw e2;
            }
        }
        
        if (stderr && !stderr.includes('CertUtil:')) {
            console.error('Error de certutil:', stderr);
        }

        console.log('Salida de certutil (primeros 500 caracteres):', stdout.substring(0, 500));

        const certs = [];
        
        // Intentar diferentes formas de dividir los certificados
        let certBlocks = [];
        if (stdout.includes('================ Certificado')) {
            certBlocks = stdout.split('================ Certificado');
        } else if (stdout.includes('=============== Certificado')) {
            certBlocks = stdout.split('=============== Certificado');
        } else if (stdout.includes('Certificado')) {
            // Dividir por líneas que contengan "Certificado"
            const lines = stdout.split('\n');
            let currentBlock = '';
            for (const line of lines) {
                if (line.includes('Certificado') && currentBlock) {
                    certBlocks.push(currentBlock);
                    currentBlock = line + '\n';
                } else {
                    currentBlock += line + '\n';
                }
            }
            if (currentBlock) certBlocks.push(currentBlock);
        } else {
            // Si no hay separadores claros, intentar buscar patrones de certificado
            console.log('No se encontraron separadores estándar, intentando parseo alternativo...');
        }
        
        certBlocks.forEach((block, index) => {
            if (index === 0 && block.trim().length < 50) {
                // El primer bloque suele ser el encabezado, saltarlo
                return;
            }
            
            // Extraer número de serie con múltiples patrones
            let serialNumber = null;
            const serialPatterns = [
                /número de serie:\s*([A-Fa-f0-9\s]+)/i,
                /Serial Number:\s*([A-Fa-f0-9\s]+)/i,
                /Número de serie:\s*([A-Fa-f0-9\s]+)/i,
                /serial[:\s]+([A-Fa-f0-9\s]+)/i
            ];
            
            for (const pattern of serialPatterns) {
                const match = block.match(pattern);
                if (match) {
                    serialNumber = match[1].trim().replace(/\s+/g, '');
                    break;
                }
            }
            
            // Extraer emisor con múltiples patrones
            let issuer = null;
            const issuerPatterns = [
                /emisor:\s*(.+?)(?:\n|$)/i,
                /issuer:\s*(.+?)(?:\n|$)/i,
                /Emisor:\s*(.+?)(?:\n|$)/i
            ];
            
            for (const pattern of issuerPatterns) {
                const match = block.match(pattern);
                if (match) {
                    issuer = match[1].trim();
                    break;
                }
            }
            
            // Si no se encontró con regex, buscar línea por línea
            if (!issuer) {
                const issuerLine = block.split('\n').find(line => {
                    const lower = line.trim().toLowerCase();
                    return lower.startsWith('emisor:') || lower.startsWith('issuer:');
                });
                if (issuerLine) {
                    issuer = issuerLine.split(':').slice(1).join(':').trim();
                }
            }
            
            // Extraer sujeto con múltiples patrones
            let subject = null;
            const subjectPatterns = [
                /sujeto:\s*(.+?)(?:\n|$)/i,
                /subject:\s*(.+?)(?:\n|$)/i,
                /Sujeto:\s*(.+?)(?:\n|$)/i
            ];
            
            for (const pattern of subjectPatterns) {
                const match = block.match(pattern);
                if (match) {
                    subject = match[1].trim();
                    break;
                }
            }
            
            // Si no se encontró con regex, buscar línea por línea
            if (!subject) {
                const subjectLine = block.split('\n').find(line => {
                    const lower = line.trim().toLowerCase();
                    return lower.startsWith('sujeto:') || lower.startsWith('subject:');
                });
                if (subjectLine) {
                    subject = subjectLine.split(':').slice(1).join(':').trim();
                }
            }
            
            if (serialNumber && issuer && subject) {
                const cert = {
                    serialNumber,
                    issuer,
                    subject
                };
                console.log('Añadiendo certificado:', cert);
                certs.push(cert);
            } else {
                console.log(`Certificado ${index} - Serial: ${serialNumber ? 'OK' : 'FALTA'}, Issuer: ${issuer ? 'OK' : 'FALTA'}, Subject: ${subject ? 'OK' : 'FALTA'}`);
                if (block.length > 100) {
                    console.log('Bloque de ejemplo (primeros 200 caracteres):', block.substring(0, 200));
                }
            }
        });

        console.log(`[MAIN] Total de certificados encontrados: ${certs.length}`);
        console.log('[MAIN] ========== FIN get-windows-certificates ==========');
        return certs;
    } catch (error) {
        console.error('[MAIN] ERROR al ejecutar certutil:', error);
        console.error('[MAIN] Error message:', error.message);
        console.error('[MAIN] Error stack:', error.stack);
        console.log('[MAIN] ========== FIN get-windows-certificates (ERROR) ==========');
        return [];
    }
});

// Manejar la apertura de la ubicación del archivo
ipcMain.handle('open-file-location', async (event, filePath) => {
    try {
        const { shell } = require('electron');
        const path = require('path');
        const fs = require('fs');
        
        console.log('[MAIN] Abriendo ubicación del archivo:', filePath);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            console.error('[MAIN] El archivo no existe:', filePath);
            throw new Error('El archivo no existe en la ruta especificada');
        }
        
        // Obtener la carpeta del archivo
        const folderPath = path.dirname(filePath);
        console.log('[MAIN] Abriendo carpeta:', folderPath);
        
        // Abrir la carpeta en el explorador de Windows
        // En Windows, usar shell.showItemInFolder para seleccionar el archivo
        shell.showItemInFolder(filePath);
        
        return { success: true };
    } catch (error) {
        console.error('[MAIN] Error al abrir la ubicación del archivo:', error);
        throw error;
    }
}); 