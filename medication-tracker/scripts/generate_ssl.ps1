$domain = "getmedminder.com"
$certPath = "..\frontend\ssl\$domain.crt"
$keyPath = "..\frontend\ssl\$domain.key"

# Generate OpenSSL config
$configContent = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = US
ST = California
L = San Francisco
O = GetMedMinder
OU = Development
CN = $domain

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment

[alt_names]
DNS.1 = $domain
DNS.2 = www.$domain
"@

$configPath = "openssl.cnf"
$configContent | Out-File -FilePath $configPath -Encoding ASCII

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout $keyPath -out $certPath -config $configPath

# Clean up config file
Remove-Item $configPath
