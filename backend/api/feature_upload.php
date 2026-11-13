<?php

/** Save a validated journal/recovery image and return its public URL path. */
function pnapana_save_feature_upload(string $field = 'photo'): ?string {
    if (!isset($_FILES[$field]) || ($_FILES[$field]['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    $file = $_FILES[$field];
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) throw new InvalidArgumentException('The photo could not be uploaded.');
    if (($file['size'] ?? 0) < 1 || $file['size'] > 6 * 1024 * 1024) throw new InvalidArgumentException('Choose a photo under 6 MB.');
    if (!is_uploaded_file($file['tmp_name'])) throw new InvalidArgumentException('Invalid upload.');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime]) || @getimagesize($file['tmp_name']) === false) {
        throw new InvalidArgumentException('Choose a JPG, PNG, or WEBP photo.');
    }

    $dir = __DIR__ . '/../uploads/journal';
    if (!is_dir($dir) && !mkdir($dir, 0770, true)) throw new RuntimeException('Photo storage is unavailable.');
    $filename = bin2hex(random_bytes(18)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $dir . DIRECTORY_SEPARATOR . $filename)) {
        throw new RuntimeException('The photo could not be saved.');
    }
    return rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/') . '/uploads/journal/' . $filename;
}
function pnapana_delete_feature_upload(?string $url): void {
    if (!$url || strpos($url, '/uploads/journal/') === false) return;
    $name = basename(parse_url($url, PHP_URL_PATH) ?: '');
    if (!preg_match('/^[a-f0-9]{36}\.(?:jpg|png|webp)$/', $name)) return;
    $path = __DIR__ . '/../uploads/journal/' . $name;
    if (is_file($path)) @unlink($path);
}

/** Save an already captured data URL using the same validation as form uploads. */
function pnapana_save_feature_data_url(string $dataUrl): ?string {
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s', $dataUrl, $parts)) return null;
    $bytes = base64_decode(str_replace(["\r", "\n", ' '], '', $parts[2]), true);
    if ($bytes === false || strlen($bytes) < 1 || strlen($bytes) > 6 * 1024 * 1024 || @getimagesizefromstring($bytes) === false) return null;
    $ext = $parts[1] === 'jpeg' ? 'jpg' : $parts[1];
    $dir = __DIR__ . '/../uploads/journal';
    if (!is_dir($dir) && !mkdir($dir, 0770, true)) throw new RuntimeException('Photo storage is unavailable.');
    $filename = bin2hex(random_bytes(18)) . '.' . $ext;
    if (file_put_contents($dir . DIRECTORY_SEPARATOR . $filename, $bytes, LOCK_EX) === false) throw new RuntimeException('The photo could not be saved.');
    return rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/') . '/uploads/journal/' . $filename;
}
