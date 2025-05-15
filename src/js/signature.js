const forge = require('node-forge');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { app, ipcMain, dialog } = require('electron');
const execPromise = util.promisify(exec);

const configPath = path.join(app.getPath('userData'), 'config.json');

function saveAutoFirmaPath(ruta) {
    fs.writeFileSync(configPath, JSON.stringify({ autofirmaPath: ruta }, null, 2));
}

function loadAutoFirmaPath() {
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.autofirmaPath;
    }
    return null;
}

async function askUserForAutoFirmaPath() {
    const result = await dialog.showOpenDialog({
        title: 'Selecciona AutoFirma.exe',
        properties: ['openFile'],
        filters: [{ name: 'AutoFirma', extensions: ['exe'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    throw new Error('No se seleccionó AutoFirma.exe');
}

async function getAutoFirmaPath() {
    // 1. Intenta cargar la ruta guardada
    const rutaGuardada = loadAutoFirmaPath();
    if (rutaGuardada && fs.existsSync(rutaGuardada)) {
        return rutaGuardada;
    }
    // 2. Busca en las rutas habituales
    const posiblesRutas = [
        'C:\\Program Files\\AutoFirma\\AutoFirma.exe',
        'C:\\Archivos de programa\\AutoFirma\\AutoFirma.exe',
        'C:\\Program Files (x86)\\AutoFirma\\AutoFirma.exe'
    ];
    for (const ruta of posiblesRutas) {
        if (fs.existsSync(ruta)) {
            return ruta;
        }
    }
    // 3. Pide al usuario que seleccione la ruta
    try {
        const userPath = await askUserForAutoFirmaPath();
        if (userPath && fs.existsSync(userPath)) {
            saveAutoFirmaPath(userPath);
            return userPath;
        }
    } catch (e) {
        throw new Error('No se seleccionó AutoFirma.exe');
    }
    throw new Error('No se encontró AutoFirma en las rutas habituales ni se seleccionó manualmente. Por favor, instálala desde https://firmaelectronica.gob.es/Home/Descargas.html.');
}

class FacturaeSigner {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: false,
            trimValues: false
        });
        
        this.builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: false,
            suppressBooleanAttributes: false
        });
    }

    async loadCertificate(certPath, windowsCertSerial = null) {
        try {
            // Si el certificado está en el almacén de Windows
            if (certPath === 'windows') {
                console.log('Buscando certificado en Windows con número de serie:', windowsCertSerial);
                
                // Primero verificamos que el certificado existe y es válido
                console.log('Verificando certificado con certutil -store...');
                const { stdout: verifyStdout } = await execPromise(`certutil -user -store My "${windowsCertSerial}"`);
                console.log('Salida de verificación:', verifyStdout);
                
                // Verificar que el certificado es válido
                if (
                    !verifyStdout.includes('Se ha pasado la prueba de firma') &&
                    !verifyStdout.includes('Prueba de cifrado correcta')
                ) {
                    throw new Error('El certificado no ha pasado la prueba de firma');
                }

                // Extraer información del certificado
                const hashMatch = verifyStdout.match(/Hash de cert\(sha1\): ([0-9a-f]+)/i);
                const providerMatch = verifyStdout.match(/Proveedor = ([^\r\n]+)/);
                const containerMatch = verifyStdout.match(/Contenedor de claves = ([^\r\n]+)/);
                
                if (!hashMatch || !providerMatch || !containerMatch) {
                    throw new Error('No se pudo extraer toda la información del certificado');
                }
                
                const certInfo = {
                    hash: hashMatch[1],
                    provider: providerMatch[1].trim(),
                    container: containerMatch[1].trim()
                };
                
                console.log('Información del certificado:', certInfo);
                
                // Crear un objeto de certificado virtual
                const cert = {
                    publicKey: {
                        toString: () => {
                            // Devolver una representación del certificado
                            return `Windows Certificate Store: ${certInfo.hash}`;
                        }
                    },
                    issuer: {
                        toString: () => {
                            // Extraer el emisor de la salida
                            const issuerMatch = verifyStdout.match(/Emisor: ([^\r\n]+)/);
                            return issuerMatch ? issuerMatch[1].trim() : 'Unknown';
                        }
                    },
                    serialNumber: windowsCertSerial,
                    validity: {
                        notBefore: new Date(),
                        notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 año
                    }
                };
                
                console.log('Certificado virtual creado exitosamente');
                return cert;
            }

            // Si es un archivo de certificado .p12
            const certData = fs.readFileSync(certPath);
            const p12Asn1 = forge.asn1.fromDer(certData);
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1);
            
            // Obtener el certificado del archivo .p12
            const certBags = p12.getBags({ friendlyName: 'certificate' })[0];
            if (!certBags || certBags.length === 0) {
                throw new Error('No se encontró ningún certificado en el archivo .p12');
            }
            
            const cert = certBags[0].cert;
            
            // Verificar que el certificado no está caducado
            const now = new Date();
            if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
                throw new Error('El certificado está caducado o no es válido aún');
            }
            
            return cert;
        } catch (error) {
            throw new Error(`Error al cargar el certificado: ${error.message}`);
        }
    }

    async loadPrivateKey(keyPath, password) {
        try {
            // Si el certificado está en el almacén de Windows
            if (keyPath === 'windows') {
                // En Windows, la clave privada se maneja automáticamente
                return null;
            }

            // Si es un archivo .p12
            const certData = fs.readFileSync(keyPath);
            const p12Asn1 = forge.asn1.fromDer(certData);
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
            
            // Obtener la clave privada del archivo .p12
            const keyBags = p12.getBags({ friendlyName: 'privateKey' })[0];
            if (!keyBags || keyBags.length === 0) {
                throw new Error('No se encontró ninguna clave privada en el archivo .p12');
            }
            
            return keyBags[0].key;
        } catch (error) {
            throw new Error(`Error al cargar la clave privada: ${error.message}`);
        }
    }

    extractCertificateFromWindowsStore(certutilOutput) {
        // Buscar el certificado en el output de certutil
        const certMatch = certutilOutput.match(/-----BEGIN CERTIFICATE-----\r?\n[\s\S]*?-----END CERTIFICATE-----/);
        return certMatch ? certMatch[0] : null;
    }

    async signXML(xmlContent, cert, privateKey) {
        try {
            // Parsear el XML
            let xmlObj = this.parser.parse(xmlContent);
            
            // Eliminar la firma existente si existe
            if (xmlObj['ds:Signature']) {
                delete xmlObj['ds:Signature'];
            }
            // Además, eliminar cualquier bloque <ds:Signature>...</ds:Signature> por si acaso (limpieza extra)
            let xmlString = this.builder.build(xmlObj);
            xmlString = xmlString.replace(/<ds:Signature[\s\S]*?<\/ds:Signature>/g, '');

            // Si es un certificado de Windows, abrir AutoFirma GUI para que el usuario firme manualmente
            if (cert.publicKey.toString().startsWith('Windows Certificate Store:')) {
                console.log('Abriendo AutoFirma GUI para que el usuario firme manualmente...');
                const tempDir = path.join(app.getPath('temp'), 'facturae-xml');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir);
                }
                const tempInputPath = path.join(tempDir, `facturae_input_${Date.now()}.xml`);
                fs.writeFileSync(tempInputPath, xmlString);

                // Detectar la ruta de AutoFirma automáticamente o pedirla al usuario
                let autofirmaPath;
                try {
                    autofirmaPath = await getAutoFirmaPath();
                } catch (rutaError) {
                    throw new Error(rutaError.message);
                }
                const command = `"${autofirmaPath}" "${tempInputPath}"`;
                console.log('Abriendo AutoFirma GUI:', command);
                const { exec } = require('child_process');
                exec(command);
                // Devuelve un mensaje especial para que la app muestre instrucciones al usuario
                return '__AUTOFIRMA_GUI__:' + tempInputPath;
            }

            // Crear la firma XAdES con .p12/.pfx
            const signature = this.createXAdESSignature(xmlObj, cert, privateKey);
            xmlObj['ds:Signature'] = signature;
            const signedXML = this.builder.build(xmlObj);
            return signedXML;
        } catch (error) {
            throw new Error(`Error al firmar el XML: ${error.message}`);
        }
    }

    createXAdESSignature(xmlObj, cert, privateKey) {
        // Formatear la fecha de firma según los requisitos de la Generalitat
        const now = new Date();
        const signingTime = now.toISOString()
            .replace('Z', '')  // Eliminar la Z
            .replace(/\+\d{2}:\d{2}$/, '')  // Eliminar el offset de zona horaria
            + '+02:00';  // Añadir el offset fijo de España

        // Crear el objeto de firma
        const signature = {
            '@_xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
            '@_xmlns:xades': 'http://uri.etsi.org/01903/v1.3.2#',
            '@_Id': `Signature-${Date.now()}`,
            'ds:SignedInfo': {
                'ds:CanonicalizationMethod': {
                    '@_Algorithm': 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
                },
                'ds:SignatureMethod': {
                    '@_Algorithm': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512'
                },
                'ds:Reference': [
                    {
                        '@_Id': `Reference-${Date.now()}`,
                        '@_Type': 'http://uri.etsi.org/01903#SignedProperties',
                        '@_URI': `#Signature-${Date.now()}-SignedProperties`,
                        'ds:DigestMethod': {
                            '@_Algorithm': 'http://www.w3.org/2001/04/xmlenc#sha512'
                        },
                        'ds:DigestValue': this.calculateDigest(xmlObj)
                    }
                ]
            },
            'ds:SignatureValue': this.calculateSignature(xmlObj, privateKey),
            'ds:KeyInfo': {
                'ds:X509Data': {
                    'ds:X509Certificate': cert.publicKey.toString()
                }
            },
            'ds:Object': {
                'xades:QualifyingProperties': {
                    '@_Target': `#Signature-${Date.now()}`,
                    'xades:SignedProperties': {
                        '@_Id': `Signature-${Date.now()}-SignedProperties`,
                        'xades:SignedSignatureProperties': {
                            'xades:SigningTime': signingTime,
                            'xades:SigningCertificate': {
                                'xades:Cert': {
                                    'xades:CertDigest': {
                                        'ds:DigestMethod': {
                                            '@_Algorithm': 'http://www.w3.org/2001/04/xmlenc#sha512'
                                        },
                                        'ds:DigestValue': this.calculateCertDigest(cert)
                                    },
                                    'xades:IssuerSerial': {
                                        'ds:X509IssuerName': cert.issuer.toString(),
                                        'ds:X509SerialNumber': cert.serialNumber
                                    }
                                }
                            },
                            'xades:SignaturePolicyIdentifier': {
                                'xades:SignaturePolicyId': {
                                    'xades:SigPolicyId': {
                                        'xades:Identifier': 'http://www.facturae.es/politica_de_firma_formato_facturae/politica_de_firma_formato_facturae_v3_1.pdf',
                                        'xades:Description': 'Política de Firma FacturaE v3.1'
                                    },
                                    'xades:SigPolicyHash': {
                                        'ds:DigestMethod': {
                                            '@_Algorithm': 'http://www.w3.org/2000/09/xmldsig#sha1'
                                        },
                                        'ds:DigestValue': 'Ohixl6upD6av8N7pEvDABhEL6hM='
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        return signature;
    }

    calculateDigest(xmlObj) {
        // Implementar el cálculo del digest según la política de Facturae
        const xmlString = this.builder.build(xmlObj);
        const md = forge.md.sha512.create();
        md.update(xmlString);
        return forge.util.encode64(md.digest().bytes());
    }

    calculateSignature(xmlObj, privateKey) {
        // Implementar el cálculo de la firma según la política de Facturae
        const xmlString = this.builder.build(xmlObj);
        const md = forge.md.sha512.create();
        md.update(xmlString);
        const signature = privateKey.sign(md);
        return forge.util.encode64(signature);
    }

    calculateCertDigest(cert) {
        // Implementar el cálculo del digest del certificado
        const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
        const md = forge.md.sha512.create();
        md.update(certDer);
        return forge.util.encode64(md.digest().bytes());
    }
}

// Handler IPC para forzar la selección de ruta de AutoFirma desde el botón de ajustes
ipcMain.handle('force-select-autofirma', async () => {
    try {
        const result = await askUserForAutoFirmaPath();
        if (result && fs.existsSync(result)) {
            saveAutoFirmaPath(result);
            return { success: true, path: result };
        }
        return { success: false };
    } catch (e) {
        return { success: false };
    }
});

// Exportar la clase y la función
module.exports = {
    FacturaeSigner,
    getAutoFirmaPath
}; 