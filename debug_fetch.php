<?php
$content = file_get_contents("http://localhost/pnapana/backend/api/get_notifications.php?user_id=1");
file_put_contents("debug_output.txt", $content);
?>
