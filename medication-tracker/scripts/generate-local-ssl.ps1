# Create SSL directory if it doesn't exist
New-Item -ItemType Directory -Force -Path nginx/ssl

# Generate self-signed certificate for localhost
$cert = New-SelfSignedCertificate `
    -DnsName "localhost" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(1) `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyUsage DigitalSignature, KeyEncipherment `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

# Export certificate
$certPassword = ConvertTo-SecureString -String "development" -Force -AsPlainText
$certPath = "nginx/ssl/localhost.pfx"
$certPathCrt = "nginx/ssl/localhost.crt"
$certPathKey = "nginx/ssl/localhost.key"

Export-PfxCertificate -Cert $cert -FilePath $certPath -Password $certPassword
$cert | Export-Certificate -FilePath $certPathCrt -Type CERT
Remove-Item -Path "cert:\LocalMachine\My\$($cert.Thumbprint)"

# Convert PFX to PEM (private key)
$process = Start-Process -FilePath "openssl" -ArgumentList "pkcs12 -in $certPath -nocerts -nodes -out $certPathKey" -NoNewWindow -PassThru
$process.WaitForExit()

Write-Host "Self-signed certificates generated successfully!"
Write-Host "Certificate: $certPathCrt"
Write-Host "Private Key: $certPathKey"
