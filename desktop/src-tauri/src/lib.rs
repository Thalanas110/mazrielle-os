mod crypto;

use std::sync::Mutex;
use tauri::State;
use zeroize::Zeroize;

struct VaultState(Mutex<Option<[u8; 32]>>);

fn current_key(state: &State<'_, VaultState>) -> Result<[u8; 32], String> {
    let guard = state.0.lock().map_err(|_| "Vault state is unavailable".to_string())?;
    guard.ok_or_else(|| "Vault is locked".to_string())
}

#[tauri::command]
fn vault_setup(state: State<'_, VaultState>, master_password: String, recovery_key: String) -> Result<crypto::VaultEnvelope, String> {
    let (envelope, key) = crypto::setup(&master_password, &recovery_key)?;
    let mut guard = state.0.lock().map_err(|_| "Vault state is unavailable".to_string())?;
    if let Some(mut previous) = guard.take() { previous.zeroize(); }
    *guard = Some(key);
    Ok(envelope)
}

#[tauri::command]
fn vault_unlock(state: State<'_, VaultState>, secret: String, envelope: crypto::VaultEnvelope) -> Result<(), String> {
    let key = crypto::unlock(&secret, &envelope)?;
    let mut guard = state.0.lock().map_err(|_| "Vault state is unavailable".to_string())?;
    if let Some(mut previous) = guard.take() { previous.zeroize(); }
    *guard = Some(key);
    Ok(())
}

#[tauri::command]
fn vault_lock(state: State<'_, VaultState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|_| "Vault state is unavailable".to_string())?;
    if let Some(mut key) = guard.take() { key.zeroize(); }
    Ok(())
}

#[tauri::command]
fn vault_encrypt(state: State<'_, VaultState>, plaintext: String) -> Result<crypto::EncryptedPayload, String> {
    let key = current_key(&state)?;
    crypto::encrypt(&key, &plaintext)
}

#[tauri::command]
fn vault_decrypt(state: State<'_, VaultState>, payload: crypto::EncryptedPayload) -> Result<String, String> {
    let key = current_key(&state)?;
    crypto::decrypt(&key, &payload)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(VaultState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![vault_setup, vault_unlock, vault_lock, vault_encrypt, vault_decrypt])
        .run(tauri::generate_context!())
        .expect("error while running Mazrielle OS");
}
