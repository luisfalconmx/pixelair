//! Writes optimized images to the folder chosen by the user.

use percent_encoding::percent_decode_str;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request};

const DIR_HEADER: &str = "x-output-dir";
const NAME_HEADER: &str = "x-file-name";

fn header(request: &Request<'_>, name: &str) -> Result<String, String> {
    let raw = request
        .headers()
        .get(name)
        .ok_or_else(|| format!("missing `{name}` header"))?
        .to_str()
        .map_err(|e| e.to_string())?;
    percent_decode_str(raw)
        .decode_utf8()
        .map(|s| s.into_owned())
        .map_err(|e| e.to_string())
}

/// Only plain file names are accepted: no separators, no `..`, no hidden traversal tricks.
pub fn validate_file_name(name: &str) -> Result<&str, String> {
    let invalid = name.is_empty()
        || name == "."
        || name == ".."
        || name.contains(['/', '\\', '\0'])
        || name.len() > 255;
    if invalid {
        Err(format!("invalid file name: {name:?}"))
    } else {
        Ok(name)
    }
}

/// Returns `dir/name`, or `dir/stem (n).ext` when that file already exists,
/// so exports never overwrite existing files (e.g. the originals).
pub fn unique_path(dir: &Path, name: &str) -> PathBuf {
    let candidate = dir.join(name);
    if !candidate.exists() {
        return candidate;
    }
    let (stem, ext) = match name.rfind('.') {
        Some(i) if i > 0 => (&name[..i], &name[i..]),
        _ => (name, ""),
    };
    (1..)
        .map(|n| dir.join(format!("{stem} ({n}){ext}")))
        .find(|p| !p.exists())
        .expect("infinite iterator always yields")
}

pub fn write_output(dir: &Path, name: &str, data: &[u8]) -> Result<PathBuf, String> {
    let name = validate_file_name(name)?;
    if !dir.is_dir() {
        return Err(format!("{} is not a folder", dir.display()));
    }
    let path = unique_path(dir, name);
    std::fs::write(&path, data).map_err(|e| format!("could not write {}: {e}", path.display()))?;
    Ok(path)
}

/// Raw-body command: the image bytes travel as the IPC body (no JSON encoding),
/// the destination as percent-encoded headers. Returns the written path.
#[tauri::command]
pub fn save_output(request: Request<'_>) -> Result<String, String> {
    let InvokeBody::Raw(data) = request.body() else {
        return Err("expected raw image bytes".into());
    };
    let dir = PathBuf::from(header(&request, DIR_HEADER)?);
    let name = header(&request, NAME_HEADER)?;
    write_output(&dir, &name, data).map(|p| p.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("pixelair-test-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn rejects_path_traversal() {
        assert!(validate_file_name("../evil.png").is_err());
        assert!(validate_file_name("a/b.png").is_err());
        assert!(validate_file_name("a\\b.png").is_err());
        assert!(validate_file_name("..").is_err());
        assert!(validate_file_name("").is_err());
        assert!(validate_file_name("image@2x.webp").is_ok());
    }

    #[test]
    fn never_overwrites_existing_files() {
        let dir = temp_dir("unique");
        let first = write_output(&dir, "image@2x.webp", b"one").unwrap();
        let second = write_output(&dir, "image@2x.webp", b"two").unwrap();
        let third = write_output(&dir, "image@2x.webp", b"three").unwrap();
        assert_eq!(first.file_name().unwrap(), "image@2x.webp");
        assert_eq!(second.file_name().unwrap(), "image@2x (1).webp");
        assert_eq!(third.file_name().unwrap(), "image@2x (2).webp");
        assert_eq!(std::fs::read(&first).unwrap(), b"one");
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn fails_when_folder_is_missing() {
        let dir = std::env::temp_dir().join("pixelair-definitely-missing-dir");
        assert!(write_output(&dir, "a.png", b"x").is_err());
    }
}
