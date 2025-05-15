const { ipcRenderer } = require('electron');

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
    document.querySelector('.main-content h1').textContent = t.h1;
    document.getElementById('selectFile').textContent = t.selectFile;
    document.getElementById('selectedFile').textContent = t.noFile;
    document.getElementById('selectFolder').textContent = t.selectFolder;
    document.getElementById('selectedFolder').textContent = t.noFolder;
    document.querySelector('label[for="outputFileName"]').textContent = t.fileName;
    document.getElementById('outputFileName').placeholder = t.fileNamePlaceholder;
    document.getElementById('processFile').textContent = t.process;
    document.getElementById('dropOverlay').querySelector('span').textContent = t.dropText;
    document.querySelector('footer p').textContent = `© 2025 Solucions Socials Sostenibles - ${t.copyright}`;
    document.title = lang === 'ca' ? 'Processador de Factures Holded - Solucions Socials Sostenibles' : 'Procesador de Facturas Holded - Solucions Socials Sostenibles';
    // Vista previa
    document.querySelector('.preview-header h2').textContent = t.readyToSign;
    document.querySelector('.preview-header p').textContent = t.readyToSignDesc;
    document.querySelector('.preview-instructions h3').textContent = t.instructionsTitle;
    const ol = document.querySelector('.preview-instructions ol');
    ol.innerHTML = '';
    t.instructions.forEach(inst => {
        const li = document.createElement('li');
        li.textContent = inst;
        ol.appendChild(li);
    });
    document.getElementById('openFileLocation').textContent = `${t.openLocation}`;
    // Botón de procesar otro archivo (si existe)
    const processAnotherBtn = document.getElementById('processAnotherFile');
    if (processAnotherBtn) processAnotherBtn.textContent = t.processAnother;
    // Sección de certificados (si se muestra en el futuro)
    document.querySelector('.section-title').textContent = t.certificateTitle;
    document.querySelector('label[for="windowsCert"]').textContent = t.useWindowsCert;
    document.querySelector('label[for="fileCert"]').textContent = t.selectFileCert;
    document.querySelector('label[for="certificate"]').textContent = t.certificateFile;
    document.getElementById('certificate').placeholder = t.certificateFilePlaceholder;
    document.getElementById('selectCertificate').textContent = t.selectCertificate;
    document.querySelector('label[for="certPassword"]').textContent = t.certificatePassword;
    document.getElementById('certPassword').placeholder = t.certificatePasswordPlaceholder;
    // Limpiar mensajes de estado
    showStatus('', '');
    // Si la vista previa está visible, actualiza el botón de procesar otro archivo
    const preview = document.getElementById('file-preview-container');
    if (preview && preview.style.display !== 'none') {
        const btn = document.getElementById('processAnotherFile');
        if (btn) btn.textContent = t.processAnother;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dropOverlay = document.getElementById('dropOverlay');

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

    // Manejar la selección del tipo de certificado
    const certTypeRadios = document.getElementsByName('certType');
    const certificateFileGroup = document.getElementById('certificateFileGroup');
    const certificatePasswordGroup = document.getElementById('certificatePasswordGroup');
    const windowsCertSelectGroup = document.getElementById('windowsCertSelectGroup');
    const windowsCertSelect = document.getElementById('windowsCertSelect');
    const fileInputContainer = document.querySelector('.file-input-container');

    certTypeRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
            if (e.target.value === 'windows') {
                // Mostrar el grupo de selección de certificados de Windows
                windowsCertSelectGroup.style.display = 'flex';
                // Ocultar los campos de archivo y contraseña
                certificateFileGroup.style.display = 'none';
                certificatePasswordGroup.style.display = 'none';
                certificateFileGroup.classList.remove('visible');
                certificatePasswordGroup.classList.remove('visible');
                fileInputContainer.classList.remove('expanded');
                // Pedir la lista de certificados y mostrarlos como tarjetas
                const windowsCertList = document.getElementById('windowsCertList');
                windowsCertList.innerHTML = '<div style="padding:1rem;">Cargando certificados...</div>';
                const certs = await ipcRenderer.invoke('get-windows-certificates');
                windowsCertList.innerHTML = '';
                if (certs.length === 0) {
                    windowsCertList.innerHTML = '<div style="padding:1rem;">No se encontraron certificados</div>';
                } else {
                    certs.forEach((cert, idx) => {
                        const card = document.createElement('div');
                        card.className = 'cert-card';
                        card.tabIndex = 0;
                        card.dataset.serial = cert.serialNumber;
                        card.innerHTML = `
                            <div class="cert-icon"><i class="fas fa-id-card"></i></div>
                            <div class="cert-info">
                                <div class="cert-subject">
                                    <span class="marquee"><b>${extractCN(cert.subject)}</b></span>
                                </div>
                                <div class="cert-issuer">${extractShortIssuer(cert.issuer)}</div>
                                <div class="cert-serial"><code>${cert.serialNumber}</code></div>
                            </div>
                        `;
                        card.onclick = () => {
                            windowsCertList.querySelectorAll('.cert-card.selected').forEach(el => el.classList.remove('selected'));
                            card.classList.add('selected');
                            document.getElementById('windowsCertSelected').value = cert.serialNumber;
                        };
                        windowsCertList.appendChild(card);
                    });
                }
            } else {
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
    const filePath = await ipcRenderer.invoke('select-file');
    if (filePath) {
        document.getElementById('selectedFile').textContent = filePath;
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
    const filePath = document.getElementById('selectedFile').textContent;
    const outputFolder = document.getElementById('selectedFolder').textContent;
    const outputFileName = document.getElementById('outputFileName').value;

    if (filePath === translations[currentLang].noFile) {
        showStatus('error', translations[currentLang].selectFileError);
        return;
    }

    if (outputFolder === translations[currentLang].noFolder) {
        showStatus('error', translations[currentLang].selectFolderError || 'Si us plau, selecciona una carpeta de destí');
        return;
    }

    try {
        showLoader();
        showStatus('info', translations[currentLang].loader);

        const result = await ipcRenderer.invoke('process-xml', 
            filePath, 
            outputFolder, 
            outputFileName,
            'windows',
            '',
            ''
        );

        hideLoader();

        if (result.success) {
            showStatus('success', `${translations[currentLang].success}${result.newFileName}`);
            // Ocultar formulario y mostrar solo la vista previa y el botón de procesar otro archivo
            document.getElementById('file-input-container').style.display = 'none';
            document.getElementById('preview-container-outer').style.display = 'block';
            const preview = document.getElementById('file-preview-container');
            preview.style.display = 'block';
            document.getElementById('openFileLocation').style.display = 'inline-flex';
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
            showStatus('error', `${translations[currentLang].error}${result.error}`);
        }
    } catch (error) {
        hideLoader();
        showStatus('error', `Error: ${error.message}`);
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

function showLoader(show) {
    const loader = document.getElementById('loader');
    loader.style.display = show ? 'flex' : 'none';
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