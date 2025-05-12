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
        copyright: 'Tots els drets reservats'
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
        copyright: 'Todos los derechos reservados'
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

document.getElementById('processFile').addEventListener('click', async () => {
    const filePath = document.getElementById('selectedFile').textContent;
    const folderPath = document.getElementById('selectedFolder').textContent;
    const outputFileName = document.getElementById('outputFileName').value.trim();
    
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

    showLoader(true);
    const result = await ipcRenderer.invoke('process-xml', filePath, folderPath, outputFileName);
    showLoader(false);
    
    if (result.success) {
        showStatus(translations[currentLang].success + result.newFileName, 'success');
    } else {
        showStatus(translations[currentLang].error + result.error, 'error');
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