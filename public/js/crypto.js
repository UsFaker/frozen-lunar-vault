// Client-side Encrypt/Decrypt using AES-GCM 256
// We use simple PBKDF2 to derive a strong AES key from our hashed password
const CryptoUtil = {
    async deriveKey(passwordHash) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(passwordHash),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );

        // Deterministic salt for simplicity in this demo (in production use random salt and store it)
        const salt = enc.encode("frozen-lunar-salt-2026");

        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    async encrypt(plaintext, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        
        const ciphertextBuf = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(plaintext)
        );

        return {
            ciphertext: this.bufToBase64(ciphertextBuf),
            iv: this.bufToBase64(iv)
        };
    },

    async decrypt(ciphertextBase64, ivBase64, key) {
        const iv = this.base64ToBuf(ivBase64);
        const ciphertext = this.base64ToBuf(ciphertextBase64);

        try {
            const decBuf = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );
            const dec = new TextDecoder();
            return dec.decode(decBuf);
        } catch (e) {
            console.error("Decryption failed", e);
            throw new Error("Decryption failed. Invalid key or corrupted data.");
        }
    },

    bufToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    base64ToBuf(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
};
