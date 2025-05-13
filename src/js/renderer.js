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
        dropText: 'Suelta l\'arxiu XML aquí',
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
        enterPasswordError: 'Si us plau, introdueix la contrasenya del certificat'
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
        certificateFile: 'Archivo de certificado:',
        certificateFilePlaceholder: 'Selecciona un archivo .p12',
        selectCertificate: 'Seleccionar',
        certificatePassword: 'Contraseña del certificado:',
        certificatePasswordPlaceholder: 'Introduce la contraseña',
        selectCertError: 'Por favor, selecciona un archivo de certificado',
        enterPasswordError: 'Por favor, introduce la contraseña del certificado'
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
    const fileInputContainer = document.querySelector('.file-input-container');

    certTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'windows') {
                // Primero removemos las clases de visibilidad
                certificateFileGroup.classList.remove('visible');
                certificatePasswordGroup.classList.remove('visible');
                fileInputContainer.classList.remove('expanded');
                
                // Esperamos a que termine la animación antes de ocultar
                setTimeout(() => {
                    certificateFileGroup.style.display = 'none';
                    certificatePasswordGroup.style.display = 'none';
                }, 300);
            } else {
                // Primero mostramos los elementos
                certificateFileGroup.style.display = 'flex';
                certificatePasswordGroup.style.display = 'flex';
                
                // Forzamos un reflow
                certificateFileGroup.offsetHeight;
                
                // Añadimos las clases para la animación
                fileInputContainer.classList.add('expanded');
                setTimeout(() => {
                    certificateFileGroup.classList.add('visible');
                    certificatePasswordGroup.classList.add('visible');
                }, 10);
            }
        });
    });
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
    const folderPath = document.getElementById('selectedFolder').textContent;
    const outputFileName = document.getElementById('outputFileName').value.trim();
    
    // Obtener el tipo de certificado seleccionado
    const certType = document.querySelector('input[name="certType"]:checked').value;
    let certPath = 'windows';
    let certPassword = '';

    if (certType === 'file') {
        certPath = document.getElementById('certificate').value;
        certPassword = document.getElementById('certPassword').value;
        
        if (!certPath) {
            showStatus(translations[currentLang].selectCertError, 'error');
            return;
        }
        if (!certPassword) {
            showStatus(translations[currentLang].enterPasswordError, 'error');
            return;
        }
    }
    
    // Validación avanzada del nombre de archivo
    const invalidChars = /[\\/:*?"<>|]/g;
    if (outputFileName && invalidChars.test(outputFileName)) {
        showStatus(translations[currentLang].invalidName, 'error');
        return;
    }
    if (filePath === translations[currentLang].noFile) {
        showStatus(translations[currentLang].selectFileError, 'error');
        return;
    }

    if (!folderPath) {
        showStatus('Por favor, selecciona una carpeta de destino', 'error');
        return;
    }

    showLoader(true);
    try {
        const result = await ipcRenderer.invoke('process-xml', filePath, folderPath, outputFileName, certPath, certPassword);
        
        if (result.success) {
            showStatus(translations[currentLang].success + result.newFileName, 'success');
        } else {
            showStatus(translations[currentLang].error + result.error, 'error');
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
});

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