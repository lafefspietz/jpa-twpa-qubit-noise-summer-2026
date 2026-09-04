<?php
    $sporeUrl = "https://raw.githubusercontent.com/lafefspietz/jpa-twpa-qubit-noise-summer-2026/refs/heads/main/twpa/spore.json";
    $baseUrl = explode("spore.json",$sporeUrl)[0];
    $files = json_decode(file_get_contents($sporeUrl), true);
    foreach ($files as $file) {
        @copy($baseUrl.$file,$file);
    }
?>
<a href = "index.html">index.html</a>
<style>
a{
    font-size:3em;
    color:blue;
    font-family:arial;
}
</style>