use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};

pub const CRYPTO_VERSION: u8 = 1;
const KEY_BYTES: usize = 32;
const NONCE_BYTES: usize = 12;
const SALT_BYTES: usize = 16;
pub const MEMORY_SIZE: u32 = 19_456;
pub const ITERATIONS: u32 = 2;
pub const PARALLELISM: u32 = 1;

#[derive(Clone, Serialize, Deserialize)]
pub struct EncryptedPayload {
    pub version: u8,
    pub algorithm: String,
    pub nonce: String,
    pub ciphertext: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WrappedKey {
    pub algorithm: String,
    pub kdf: String,
    pub salt: String,
    pub nonce: String,
    pub ciphertext: String,
    pub memory_size: u32,
    pub iterations: u32,
    pub parallelism: u32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct VaultEnvelope {
    pub version: u8,
    pub password: WrappedKey,
    pub recovery: WrappedKey,
}

fn derive_key(secret: &str, salt: &[u8]) -> Result<[u8; KEY_BYTES], String> {
    let params = Params::new(MEMORY_SIZE, ITERATIONS, PARALLELISM, Some(KEY_BYTES)).map_err(|e| e.to_string())?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0_u8; KEY_BYTES];
    argon.hash_password_into(secret.as_bytes(), salt, &mut key).map_err(|e| e.to_string())?;
    Ok(key)
}

fn encrypt_bytes(key: &[u8; KEY_BYTES], plaintext: &[u8]) -> Result<EncryptedPayload, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0_u8; NONCE_BYTES];
    OsRng.fill_bytes(&mut nonce_bytes);
    let ciphertext = cipher.encrypt(Nonce::from_slice(&nonce_bytes), plaintext).map_err(|_| "Encryption failed".to_string())?;
    Ok(EncryptedPayload { version: CRYPTO_VERSION, algorithm: "AES-256-GCM".into(), nonce: STANDARD.encode(nonce_bytes), ciphertext: STANDARD.encode(ciphertext) })
}

fn decrypt_bytes(key: &[u8; KEY_BYTES], payload: &EncryptedPayload) -> Result<Vec<u8>, String> {
    if payload.version != CRYPTO_VERSION || payload.algorithm != "AES-256-GCM" { return Err("Unsupported encrypted payload".into()); }
    let nonce = STANDARD.decode(&payload.nonce).map_err(|e| e.to_string())?;
    let ciphertext = STANDARD.decode(&payload.ciphertext).map_err(|e| e.to_string())?;
    if nonce.len() != NONCE_BYTES { return Err("Invalid nonce".into()); }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    cipher.decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref()).map_err(|_| "Decryption failed".into())
}

fn wrap_key(secret: &str, vault_key: &[u8; KEY_BYTES]) -> Result<WrappedKey, String> {
    let mut salt = [0_u8; SALT_BYTES];
    OsRng.fill_bytes(&mut salt);
    let derived = derive_key(secret, &salt)?;
    let encrypted = encrypt_bytes(&derived, vault_key)?;
    Ok(WrappedKey { algorithm: encrypted.algorithm, kdf: "Argon2id".into(), salt: STANDARD.encode(salt), nonce: encrypted.nonce, ciphertext: encrypted.ciphertext, memory_size: MEMORY_SIZE, iterations: ITERATIONS, parallelism: PARALLELISM })
}

fn unwrap_key(secret: &str, wrapped: &WrappedKey) -> Result<[u8; KEY_BYTES], String> {
    let salt = STANDARD.decode(&wrapped.salt).map_err(|e| e.to_string())?;
    let derived = derive_key(secret, &salt)?;
    let encrypted = EncryptedPayload { version: CRYPTO_VERSION, algorithm: wrapped.algorithm.clone(), nonce: wrapped.nonce.clone(), ciphertext: wrapped.ciphertext.clone() };
    let bytes = decrypt_bytes(&derived, &encrypted)?;
    if bytes.len() != KEY_BYTES { return Err("Invalid vault key length".into()); }
    let mut key = [0_u8; KEY_BYTES];
    key.copy_from_slice(&bytes);
    Ok(key)
}

pub fn setup(master_password: &str, recovery_key: &str) -> Result<(VaultEnvelope, [u8; KEY_BYTES]), String> {
    let mut vault_key = [0_u8; KEY_BYTES];
    OsRng.fill_bytes(&mut vault_key);
    let envelope = VaultEnvelope { version: CRYPTO_VERSION, password: wrap_key(master_password, &vault_key)?, recovery: wrap_key(recovery_key, &vault_key)? };
    Ok((envelope, vault_key))
}

pub fn unlock(secret: &str, envelope: &VaultEnvelope) -> Result<[u8; KEY_BYTES], String> {
    unwrap_key(secret, &envelope.password).or_else(|_| unwrap_key(secret, &envelope.recovery))
}

pub fn encrypt(key: &[u8; KEY_BYTES], plaintext: &str) -> Result<EncryptedPayload, String> {
    encrypt_bytes(key, plaintext.as_bytes())
}

pub fn decrypt(key: &[u8; KEY_BYTES], payload: &EncryptedPayload) -> Result<String, String> {
    String::from_utf8(decrypt_bytes(key, payload)?).map_err(|e| e.to_string())
}
