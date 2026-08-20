<?php
/**
 * Minimal transactional email.
 *
 * Uses PHP's mail(), which is what shared/cPanel hosts provide out of the box.
 * No Composer dependency, matching the rest of this project.
 *
 * Optional config.php settings:
 *   MAIL_FROM       - envelope/From address (default: no-reply@<host>)
 *   MAIL_FROM_NAME  - display name (default: the site name)
 */

if (!function_exists('pnapana_send_mail')) {

    function pnapana_mail_from() {
        if (defined('MAIL_FROM') && MAIL_FROM !== '') {
            return MAIL_FROM;
        }
        $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST']) : 'localhost';
        return 'no-reply@' . $host;
    }

    /**
     * Sends a plain-text email. Returns true if the MTA accepted it — which is
     * not the same as delivery, so never surface the result to the end user in a
     * way that reveals whether an address exists.
     */
    function pnapana_send_mail($to, $subject, $body) {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $fromAddress = pnapana_mail_from();
        $fromName = defined('MAIL_FROM_NAME') && MAIL_FROM_NAME !== '' ? MAIL_FROM_NAME : 'Pnapana';

        // Header injection defence: a newline in either field would let an
        // attacker append arbitrary headers.
        $subject = str_replace(["\r", "\n"], '', $subject);
        $fromName = str_replace(["\r", "\n", '"'], '', $fromName);

        $headers = implode("\r\n", [
            'From: "' . $fromName . '" <' . $fromAddress . '>',
            'Reply-To: ' . $fromAddress,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            'X-Mailer: Pnapana',
        ]);

        $ok = @mail($to, $subject, $body, $headers);

        if (!$ok) {
            error_log("pnapana_send_mail: mail() rejected a message to $to");
        }

        return $ok;
    }
}
