console.log('========== RENDERER.JS CARGADO ==========');
console.log('Verificando ipcRenderer...');
const { ipcRenderer } = require('electron');
console.log('ipcRenderer cargado:', typeof ipcRenderer !== 'undefined');

// Internacionalización
const translations = {
    ca: {
        h1: 'Processador de Factures Holded',
        selectFile: 'Selecciona arxiu XML',
        noFile: 'Cap arxiu seleccionat',
        selectFolder: 'Selecciona carpeta de destí',
        noFolder: 'Carpeta de destí no seleccionada',
        fileName: "Nom de l'arxiu:",
        fileNamePlaceholder: 'Opcional. Ex: factura_modificada.xml',
        process: 'Processa arxiu',
        loader: 'Processant...',
        success: 'Arxiu processat correctament. Guardat com: ',
        error: ", Error en processar l'arxiu: ",
        invalidName: 'El nom de l\'arxiu conté caràcters no permesos: \\ / : * ? " < > |',
        selectFileError: 'Si us plau, selecciona un arxiu XML',
        dragSuccess: 'Arxiu XML seleccionat per arrossegar.',
        dragError: 'Només es permeten arxius XML.',
        dropText: 'Solta l\'arxiu XML aquí',
        copyright: 'Tots els drets reservats',
        certificateTitle: 'Certificat digital:',
        useWindowsCert: 'Utilitzar certificat de Windows',
        selectFileCert: 'Seleccionar arxiu de certificat',
        certificateFile: 'Arxiu de certificat:',
        certificateFilePlaceholder: 'Selecciona un arxiu .p12',
        selectCertificate: 'Seleccionar',
        certificatePassword: 'Contrasenya del certificat:',
        certificatePasswordPlaceholder: 'Introdueix la contrasenya',
        selectCertError: 'Si us plau, selecciona un arxiu de certificat',
        enterPasswordError: 'Si us plau, introdueix la contrasenya del certificat',
        readyToSign: 'Arxiu llest per signar',
        readyToSignDesc: 'Prem "Obrir ubicació" i arrossega l\'arxiu a AutoFirma per signar-lo',
        instructionsTitle: 'Instruccions:',
        instructions: [
            'Prem "Obrir ubicació"',
            'Arrossega l\'arxiu des de l\'explorador de Windows a la finestra d\'AutoFirma',
            'Selecciona el teu certificat',
            'Signa el document',
            'Guarda l\'arxiu signat'
        ],
        openLocation: 'Obrir ubicació',
        processAnother: 'Processar un altre arxiu',
        signedFileSelected: 'Arxiu signat seleccionat correctament. Pots continuar el procés.'
    },
    es: {
        h1: 'Procesador de Facturas Holded',
        selectFile: 'Seleccionar Archivo XML',
        noFile: 'Ningún archivo seleccionado',
        selectFolder: 'Seleccionar Carpeta de Destino',
        noFolder: 'Carpeta de destino no seleccionada',
        fileName: 'Nombre del archivo:',
        fileNamePlaceholder: 'Opcional. Ej: factura_modificada.xml',
        process: 'Procesar Archivo',
        loader: 'Procesando...',
        success: 'Archivo procesado correctamente. Guardado como: ',
        error: ', Error al procesar el archivo: ',
        invalidName: 'El nombre del archivo contiene caracteres no permitidos: \\ / : * ? " < > |',
        selectFileError: 'Por favor, seleccione un archivo XML',
        dragSuccess: 'Archivo XML seleccionado por arrastrar.',
        dragError: 'Solo se permiten archivos XML.',
        dropText: 'Suelta el archivo XML aquí',
        copyright: 'Todos los derechos reservados',
        certificateTitle: 'Certificado digital:',
        useWindowsCert: 'Usar certificado de Windows',
        selectFileCert: 'Seleccionar archivo de certificado',
        certificateFile: 'Arxiu de certificat:',
        certificateFilePlaceholder: 'Selecciona un archivo .p12',
        selectCertificate: 'Seleccionar',
        certificatePassword: 'Contraseña del certificado:',
        certificatePasswordPlaceholder: 'Introduce la contraseña',
        selectCertError: 'Por favor, selecciona un archivo de certificado',
        enterPasswordError: 'Por favor, introduce la contraseña del certificado',
        readyToSign: 'Archivo listo para firmar',
        readyToSignDesc: 'Pulsa "Abrir ubicación" y arrastra el archivo a AutoFirma para firmarlo',
        instructionsTitle: 'Instrucciones:',
        instructions: [
            'Pulsa "Abrir ubicación"',
            'Arrastra el archivo desde el explorador de Windows a la ventana de AutoFirma',
            'Selecciona tu certificado',
            'Firma el documento',
            'Guarda el archivo firmado'
        ],
        openLocation: 'Abrir ubicación',
        processAnother: 'Procesar otro archivo',
        signedFileSelected: 'Archivo firmado seleccionado correctamente. Puedes continuar el proceso.'
    }
};

let currentLang = 'ca';

function setLang(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    // Elementos básicos que siempre existen
    const h1 = document.querySelector('.main-content h1');
    if (h1) h1.textContent = t.h1;
    
    const selectFileBtn = document.getElementById('selectFile');
    if (selectFileBtn) selectFileBtn.textContent = t.selectFile;
    
    const selectedFile = document.getElementById('selectedFile');
    if (selectedFile && selectedFile.textContent === translations[currentLang === 'ca' ? 'es' : 'ca'].noFile) {
        selectedFile.textContent = t.noFile;
    }
    
    const selectFolderBtn = document.getElementById('selectFolder');
    if (selectFolderBtn) selectFolderBtn.textContent = t.selectFolder;
    
    const selectedFolder = document.getElementById('selectedFolder');
    if (selectedFolder && selectedFolder.textContent === translations[currentLang === 'ca' ? 'es' : 'ca'].noFolder) {
        selectedFolder.textContent = t.noFolder;
    }
    
    const fileNameLabel = document.querySelector('label[for="outputFileName"]');
    if (fileNameLabel) fileNameLabel.textContent = t.fileName;
    
    const outputFileName = document.getElementById('outputFileName');
    if (outputFileName) outputFileName.placeholder = t.fileNamePlaceholder;
    
    const processFileBtn = document.getElementById('processFile');
    if (processFileBtn) processFileBtn.textContent = t.process;
    
    const dropOverlay = document.getElementById('dropOverlay');
    if (dropOverlay) {
        const span = dropOverlay.querySelector('span');
        if (span) span.textContent = t.dropText;
    }
    
    const footer = document.querySelector('footer p');
    if (footer) footer.textContent = `© 2025 Solucions Socials Sostenibles - ${t.copyright}`;
    
    document.title = lang === 'ca' ? 'Processador de Factures Holded - Solucions Socials Sostenibles' : 'Procesador de Facturas Holded - Solucions Socials Sostenibles';
    
    // Vista previa (solo si existe)
    const previewHeaderH2 = document.querySelector('.preview-header h2');
    if (previewHeaderH2) previewHeaderH2.textContent = t.readyToSign;
    
    const previewHeaderP = document.querySelector('.preview-header p');
    if (previewHeaderP) previewHeaderP.textContent = t.readyToSignDesc;
    
    const instructionsH3 = document.querySelector('.preview-instructions h3');
    if (instructionsH3) instructionsH3.textContent = t.instructionsTitle;
    
    const ol = document.querySelector('.preview-instructions ol');
    if (ol) {
        ol.innerHTML = '';
        t.instructions.forEach(inst => {
            const li = document.createElement('li');
            li.textContent = inst;
            ol.appendChild(li);
        });
    }
    
    const openFileLocationBtn = document.getElementById('openFileLocation');
    if (openFileLocationBtn) openFileLocationBtn.textContent = t.openLocation;
    
    // Limpiar mensajes de estado
    showStatus('', '');
}

console.log('Esperando DOMContentLoaded...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('========== DOMContentLoaded DISPARADO ==========');
    const dropOverlay = document.getElementById('dropOverlay');
    console.log('dropOverlay encontrado:', dropOverlay);

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropOverlay.classList.add('visible');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (e.relatedTarget === null) {
            dropOverlay.classList.remove('visible');
        }
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dropOverlay.classList.remove('visible');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.xml')) {
                document.getElementById('selectedFile').textContent = file.path;
                showStatus('Arxiu XML seleccionat per arrossegar.', 'success');
            } else {
                showStatus('Només es permeten arxius XML.', 'error');
            }
        }
    });

    const langSelect = document.getElementById('langSelect');
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => {
        setLang(e.target.value);
    });
    setLang(currentLang);

    // Función para escanear certificados (reutilizable) - EXPONER GLOBALMENTE
    window.scanCertificates = async () => {
        console.log('[RENDERER] scanCertificates llamado');
        const windowsCertSelectGroup = document.getElementById('windowsCertSelectGroup');
        const windowsCertList = document.getElementById('windowsCertList');
        if (!windowsCertList) {
            console.error('[RENDERER] No se encontró el elemento windowsCertList');
            return;
        }
        if (!windowsCertSelectGroup) {
            console.error('[RENDERER] No se encontró el elemento windowsCertSelectGroup');
            return;
        }
        console.log('[RENDERER] Mostrando contenedor de certificados...');
        // Asegurar que el contenedor esté visible
        windowsCertSelectGroup.style.display = 'block';
        windowsCertSelectGroup.style.visibility = 'visible';
        windowsCertSelectGroup.style.opacity = '1';
        // Mostrar mensaje de carga
        windowsCertList.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Escaneando certificados...</div>';
        try {
            console.log('[RENDERER] Llamando a get-windows-certificates...');
            console.log('[RENDERER] ipcRenderer disponible:', typeof ipcRenderer !== 'undefined');
            const certs = await ipcRenderer.invoke('get-windows-certificates');
            console.log('[RENDERER] Certificados recibidos:', certs);
            console.log('[RENDERER] Número de certificados:', certs ? certs.length : 0);
            windowsCertList.innerHTML = '';
            if (certs.length === 0) {
                console.warn('[RENDERER] No se encontraron certificados');
                windowsCertList.innerHTML = '<div style="padding:1rem; text-align:center; color:#d32f2f;"><i class="fas fa-exclamation-triangle"></i> No se encontraron certificados en el almacén de Windows.<br><small>Verifica que tengas certificados instalados en "Certificados - Usuario actual > Personal"</small></div>';
            } else {
                console.log(`[RENDERER] Mostrando ${certs.length} certificados`);
                // Limpiar el contenedor
                windowsCertList.innerHTML = '';
                // Crear las tarjetas de certificados
                certs.forEach((cert) => {
                    const card = document.createElement('div');
                    card.className = 'cert-card';
                    card.tabIndex = 0;
                    card.dataset.serial = cert.serialNumber;
                    card.style.cssText = 'min-width: 200px; max-width: 200px; min-height: 110px; padding: 10px 14px; background: #E8F5E9; border: 2px solid #81C784; border-radius: 10px; cursor: pointer; margin: 5px; transition: all 0.3s ease; display: inline-block; vertical-align: top;';
                    card.innerHTML = `
                        <div style="text-align: center; margin-bottom: 8px;">
                            <i class="fas fa-id-card" style="font-size: 2rem; color: #2E7D32;"></i>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #1b3c1b; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${extractCN(cert.subject)}">
                                ${extractCN(cert.subject)}
                            </div>
                            <div style="font-size: 0.85em; color: #666; margin-bottom: 5px;">
                                ${extractShortIssuer(cert.issuer)}
                            </div>
                            <div style="font-size: 0.75em; color: #388e3c;">
                                <code>${cert.serialNumber}</code>
                            </div>
                        </div>
                    `;
                    // Marcar si está seleccionado
                    card.dataset.selected = 'false';
                    
                    card.onclick = () => {
                        console.log('[RENDERER] Click en certificado:', cert.serialNumber);
                        // Remover selección anterior
                        windowsCertList.querySelectorAll('.cert-card').forEach(el => {
                            el.dataset.selected = 'false';
                            el.style.border = '2px solid #81C784';
                            el.style.background = '#E8F5E9';
                            el.style.transform = 'scale(1)';
                            el.style.boxShadow = '0 2px 8px rgba(46,125,50,0.07)';
                        });
                        // Seleccionar este certificado
                        card.dataset.selected = 'true';
                        card.style.border = '4px solid #2E7D32';
                        card.style.background = '#A5D6A7';
                        card.style.transform = 'scale(1.05)';
                        card.style.boxShadow = '0 6px 20px rgba(46,125,50,0.3)';
                        card.style.fontWeight = 'bold';
                        document.getElementById('windowsCertSelected').value = cert.serialNumber;
                        console.log('[RENDERER] Certificado seleccionado:', cert.serialNumber);
                        // Mostrar feedback visual
                        showStatus('success', `Certificado seleccionado: ${extractCN(cert.subject)}`);
                    };
                    // Efecto hover
                    card.onmouseenter = () => {
                        if (card.dataset.selected !== 'true') {
                            card.style.border = '3px solid #2E7D32';
                            card.style.background = '#C8E6C9';
                            card.style.transform = 'scale(1.02)';
                        }
                    };
                    card.onmouseleave = () => {
                        if (card.dataset.selected !== 'true') {
                            card.style.border = '2px solid #81C784';
                            card.style.background = '#E8F5E9';
                            card.style.transform = 'scale(1)';
                        } else {
                            // Mantener estilo seleccionado
                            card.style.border = '4px solid #2E7D32';
                            card.style.background = '#A5D6A7';
                            card.style.transform = 'scale(1.05)';
                        }
                    };
                    windowsCertList.appendChild(card);
                });
                console.log('[RENDERER] Certificados renderizados correctamente');
            }
        } catch (error) {
            console.error('[RENDERER] Error al obtener certificados:', error);
            console.error('[RENDERER] Stack:', error.stack);
            windowsCertList.innerHTML = '<div style="padding:1rem; text-align:center; color:#d32f2f;"><i class="fas fa-exclamation-circle"></i> Error al escanear certificados: ' + (error.message || error) + '</div>';
        }
    };

    // Botón para refrescar certificados
    const refreshCertificatesBtn = document.getElementById('refreshCertificates');
    if (refreshCertificatesBtn) {
        refreshCertificatesBtn.addEventListener('click', scanCertificates);
    }

    // Manejar la selección del tipo de certificado
    const certTypeRadios = document.getElementsByName('certType');
    const certificateFileGroup = document.getElementById('certificateFileGroup');
    const certificatePasswordGroup = document.getElementById('certificatePasswordGroup');
    const windowsCertSelectGroup = document.getElementById('windowsCertSelectGroup');
    const windowsCertSelect = document.getElementById('windowsCertSelect');
    const fileInputContainer = document.querySelector('.file-input-container');

    certTypeRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
            console.log('[RENDERER] Cambio de tipo de certificado detectado:', e.target.value);
            if (e.target.value === 'windows') {
                console.log('[RENDERER] Seleccionado certificado de Windows, iniciando escaneo...');
                // Mostrar el grupo de selección de certificados de Windows
                console.log('[RENDERER] Mostrando windowsCertSelectGroup...');
                windowsCertSelectGroup.style.display = 'block';
                windowsCertSelectGroup.style.visibility = 'visible';
                // Ocultar los campos de archivo y contraseña
                certificateFileGroup.style.display = 'none';
                certificatePasswordGroup.style.display = 'none';
                certificateFileGroup.classList.remove('visible');
                certificatePasswordGroup.classList.remove('visible');
                fileInputContainer.classList.remove('expanded');
                // Escanear certificados
                console.log('[RENDERER] Llamando a scanCertificates desde el evento change...');
                scanCertificates().catch(error => {
                    console.error('[RENDERER] Error en scanCertificates desde change:', error);
                });
            } else {
                console.log('Seleccionado certificado de archivo');
                windowsCertSelectGroup.style.display = 'none';
                certificateFileGroup.style.display = 'flex';
                certificatePasswordGroup.style.display = 'flex';
                // Forzamos un reflow
                certificateFileGroup.offsetHeight;
                fileInputContainer.classList.add('expanded');
                setTimeout(() => {
                    certificateFileGroup.classList.add('visible');
                    certificatePasswordGroup.classList.add('visible');
                }, 10);
            }
        });
    });

    // Escanear certificados automáticamente al cargar
    console.log('[RENDERER] Iniciando escaneo automático de certificados...');
    setTimeout(() => {
        console.log('[RENDERER] Ejecutando scanCertificates()...');
        if (window.scanCertificates) {
            window.scanCertificates().catch(error => {
                console.error('[RENDERER] Error en scanCertificates:', error);
            });
        } else {
            console.error('[RENDERER] scanCertificates no está disponible');
        }
    }, 1000);

    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', async () => {
            // Pedir al backend que fuerce la selección de ruta de AutoFirma
            try {
                const result = await ipcRenderer.invoke('force-select-autofirma');
                if (result && result.success) {
                    showStatus('Ruta de AutoFirma actualizada correctamente.', 'success');
                } else {
                    showStatus('No se seleccionó ninguna ruta de AutoFirma.', 'error');
                }
            } catch (e) {
                showStatus('Error al actualizar la ruta de AutoFirma.', 'error');
            }
        });
    }
});

document.getElementById('selectFile').addEventListener('click', async () => {
    try {
        console.log('[RENDERER] Seleccionando archivo...');
        const filePath = await ipcRenderer.invoke('select-file');
        if (filePath) {
            console.log('[RENDERER] Archivo seleccionado:', filePath);
            document.getElementById('selectedFile').textContent = filePath;
            showStatus('success', `Archivo seleccionado: ${filePath.split('\\').pop()}`);
        } else {
            console.log('[RENDERER] No se seleccionó ningún archivo');
        }
    } catch (error) {
        console.error('[RENDERER] Error al seleccionar archivo:', error);
        showStatus('error', 'Error al seleccionar archivo: ' + error.message);
    }
});

document.getElementById('selectFolder').addEventListener('click', async () => {
    const folderPath = await ipcRenderer.invoke('select-output-folder');
    if (folderPath) {
        document.getElementById('selectedFolder').textContent = folderPath;
    }
});

document.getElementById('selectCertificate').addEventListener('click', async () => {
    const certPath = await ipcRenderer.invoke('select-certificate');
    if (certPath) {
        document.getElementById('certificate').value = certPath;
    }
});

document.getElementById('processFile').addEventListener('click', async () => {
    console.log('[RENDERER] Botón procesar archivo clickeado');
    const filePath = document.getElementById('selectedFile').textContent;
    const outputFolder = document.getElementById('selectedFolder').textContent;
    const outputFileName = document.getElementById('outputFileName').value;

    console.log('[RENDERER] filePath:', filePath);
    console.log('[RENDERER] outputFolder:', outputFolder);
    console.log('[RENDERER] outputFileName:', outputFileName);

    if (!filePath || filePath === translations[currentLang].noFile || filePath.trim() === '') {
        console.error('[RENDERER] No se ha seleccionado ningún archivo');
        showStatus('error', translations[currentLang].selectFileError);
        return;
    }

    // La carpeta de destino es opcional, si no se selecciona se guarda en la misma carpeta del archivo original
    const outputFolderFinal = (!outputFolder || outputFolder === translations[currentLang].noFolder) ? null : outputFolder;

    // Obtener el tipo de certificado seleccionado
    const certTypeRadios = document.getElementsByName('certType');
    let certType = 'windows'; // Por defecto
    let certPath = 'windows';
    let certPassword = '';
    let windowsCertSerial = '';

    for (const radio of certTypeRadios) {
        if (radio.checked) {
            certType = radio.value;
            console.log('[RENDERER] Tipo de certificado seleccionado:', certType);
            break;
        }
    }

    if (certType === 'windows') {
        // Obtener el certificado de Windows seleccionado
        windowsCertSerial = document.getElementById('windowsCertSelected').value;
        console.log('[RENDERER] Certificado Windows seleccionado:', windowsCertSerial);
        if (!windowsCertSerial || windowsCertSerial.trim() === '') {
            console.warn('[RENDERER] No se ha seleccionado ningún certificado de Windows');
            showStatus('error', 'Por favor, selecciona un certificado de Windows');
            return;
        }
        certPath = 'windows';
    } else if (certType === 'file') {
        // Obtener el archivo de certificado y la contraseña
        certPath = document.getElementById('certificate').value;
        certPassword = document.getElementById('certPassword').value;
        
        if (!certPath || certPath === '') {
            showStatus('error', translations[currentLang].selectCertError || 'Por favor, selecciona un archivo de certificado');
            return;
        }
        
        if (!certPassword || certPassword === '') {
            showStatus('error', translations[currentLang].enterPasswordError || 'Por favor, introduce la contraseña del certificado');
            return;
        }
    }

    try {
        console.log('[RENDERER] Iniciando procesamiento...');
        showLoader(true);
        showStatus('info', translations[currentLang].loader);

        console.log('[RENDERER] Llamando a process-xml con:', {
            filePath,
            outputFolderFinal,
            outputFileName,
            certPath,
            windowsCertSerial
        });

        const result = await ipcRenderer.invoke('process-xml', 
            filePath, 
            outputFolderFinal, 
            outputFileName,
            certPath,
            certPassword,
            windowsCertSerial
        );

        console.log('[RENDERER] Resultado del procesamiento:', result);
        hideLoader();

        if (result && result.success) {
            // Mostrar mensaje diferente si se usó AutoFirma
            if (result.autofirmaGui) {
                showStatus('info', `Archivo procesado y preparado para firmar. AutoFirma se ha abierto automáticamente. Por favor, selecciona tu certificado en AutoFirma y completa la firma.`);
            } else if (result.signed) {
                showStatus('success', `Archivo procesado y firmado correctamente: ${result.newFileName}`);
            } else {
                showStatus('success', `${translations[currentLang].success}${result.newFileName}`);
            }
            
            // Ocultar formulario y mostrar solo la vista previa y el botón de procesar otro archivo
            document.getElementById('file-input-container').style.display = 'none';
            document.getElementById('preview-container-outer').style.display = 'block';
            const preview = document.getElementById('file-preview-container');
            preview.style.display = 'block';
            document.getElementById('openFileLocation').style.display = 'inline-flex';
            
            // Si se usó AutoFirma, mostrar mensaje adicional
            if (result.autofirmaGui) {
                const autofirmaMessage = document.createElement('div');
                autofirmaMessage.style.cssText = 'margin-top: 1rem; padding: 1rem; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404;';
                autofirmaMessage.innerHTML = '<strong>⚠️ Importante:</strong> El archivo XML está preparado pero <strong>NO está firmado todavía</strong>. Por favor:<br>' +
                    '1. AutoFirma debería haberse abierto automáticamente<br>' +
                    '2. Si no se abrió, haz clic en "Obrir ubicació" y arrastra el archivo a AutoFirma<br>' +
                    '3. Selecciona tu certificado en AutoFirma<br>' +
                    '4. Firma el documento<br>' +
                    '5. Guarda el archivo firmado';
                preview.appendChild(autofirmaMessage);
            }
            // Añadir botón para procesar otro archivo
            let btn = document.getElementById('processAnotherFile');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'processAnotherFile';
                btn.className = 'select-button';
                btn.style.marginTop = '1.5rem';
                btn.textContent = translations[currentLang].processAnother;
                preview.appendChild(btn);
            } else {
                btn.textContent = translations[currentLang].processAnother;
                btn.style.display = 'inline-block';
            }
            btn.onclick = () => {
                preview.style.display = 'none';
                document.getElementById('preview-container-outer').style.display = 'none';
                document.getElementById('file-input-container').style.display = '';
                btn.style.display = 'none';
                // Limpiar campos
                document.getElementById('selectedFile').textContent = translations[currentLang].noFile;
                document.getElementById('selectedFolder').textContent = translations[currentLang].noFolder;
                document.getElementById('outputFileName').value = '';
                showStatus('', '');
            };
        } else {
            console.error('[RENDERER] Error en el procesamiento:', result);
            showStatus('error', `${translations[currentLang].error}${result ? result.error : 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('[RENDERER] Excepción al procesar:', error);
        console.error('[RENDERER] Stack:', error.stack);
        hideLoader();
        showStatus('error', `Error: ${error.message || error}`);
    }
});

// Escuchar el evento para mostrar la vista previa
ipcRenderer.on('show-file-preview', (event, data) => {
    console.log('Mostrando vista previa del archivo:', data);
    const container = document.getElementById('file-preview-container');
    const fileNameElement = document.getElementById('preview-file-name');
    const filePathElement = document.getElementById('preview-file-path');
    const openLocationButton = document.getElementById('openFileLocation');

    if (!container || !fileNameElement || !filePathElement || !openLocationButton) {
        console.error('No se encontraron los elementos necesarios para mostrar la vista previa');
        return;
    }

    fileNameElement.textContent = data.fileName;
    filePathElement.textContent = data.filePath;
    container.style.display = 'block';
    openLocationButton.style.display = 'inline-flex';

    // Botón para abrir la ubicación del archivo
    openLocationButton.onclick = async () => {
        try {
            await ipcRenderer.invoke('open-file-location', data.filePath);
        } catch (error) {
            console.error('Error al abrir la ubicación:', error);
            showStatus('error', 'Error al obrir la ubicació de l\'arxiu');
        }
    };
});

function mostrarSelectorArchivoFirmado(xmlOriginalPath) {
    let selector = document.getElementById('selectorArchivoFirmado');
    if (!selector) {
        selector = document.createElement('div');
        selector.id = 'selectorArchivoFirmado';
        selector.style.marginTop = '1.5rem';
        selector.innerHTML = `
            <button id="seleccionarFirmado" class="select-button">Seleccionar arxiu signat</button>
            <span id="archivoFirmadoSeleccionado" style="margin-left:1rem;"></span>
        `;
        document.querySelector('.main-content').appendChild(selector);
    }
    document.getElementById('seleccionarFirmado').onclick = async () => {
        const filePath = await ipcRenderer.invoke('select-file');
        if (!filePath) return;
        document.getElementById('archivoFirmadoSeleccionado').textContent = filePath;
        showStatus('Arxiu signat seleccionat correctament. Pots continuar el procés.', 'success');
    };
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
}

function showLoader(show = true) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function hideLoader() {
    showLoader(false);
}

function togglePassword() {
    const passwordInput = document.getElementById('certPassword');
    const toggleButton = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.classList.remove('fa-eye');
        toggleButton.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleButton.classList.remove('fa-eye-slash');
        toggleButton.classList.add('fa-eye');
    }
}

function extractCN(str) {
    const match = str.match(/CN=([^,]+)/);
    return match ? match[1] : str;
}

function extractShortIssuer(str) {
    const match = str.match(/(FNMT|AC Representación|Camerfirma|Cloud Technology|Microsoft|Adobe)/i);
    return match ? match[1] : str.split(',')[0];
} 