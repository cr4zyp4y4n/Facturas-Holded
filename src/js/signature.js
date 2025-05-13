const forge = require('node-forge');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
                // Listar todos los certificados
                const { stdout } = await execPromise('certutil -user -store My');
                // Buscar el certificado por número de serie
                const regex = /Serial Number: ([A-F0-9]+)[\s\S]*?-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
                let match;
                let foundCert = null;
                while ((match = regex.exec(stdout)) !== null) {
                    const serial = match[1].trim();
                    const pem = match[0].match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)[0];
                    if (!windowsCertSerial || serial === windowsCertSerial) {
                        foundCert = pem;
                        if (serial === windowsCertSerial) break;
                    }
                }
                if (!foundCert) {
                    throw new Error('No se encontró el certificado seleccionado en el almacén de Windows');
                }
                return forge.pki.certificateFromPem(foundCert);
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
            const xmlObj = this.parser.parse(xmlContent);
            
            // Eliminar la firma existente si existe
            if (xmlObj['ds:Signature']) {
                delete xmlObj['ds:Signature'];
            }

            // Crear la firma XAdES
            const signature = this.createXAdESSignature(xmlObj, cert, privateKey);
            
            // Añadir la firma al XML
            xmlObj['ds:Signature'] = signature;

            // Convertir de nuevo a XML
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

module.exports = FacturaeSigner; 