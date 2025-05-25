# TURN Server Setup Guide

This guide will help you set up your own TURN server for reliable cross-network video conferencing.

## Why Do You Need a TURN Server?

TURN (Traversal Using Relays around NAT) servers are essential for WebRTC applications when:

- Participants are behind strict firewalls
- Networks block peer-to-peer connections
- Symmetric NATs prevent direct connection establishment
- You need guaranteed connectivity in enterprise environments

## Option 1: Quick Setup with Coturn

### Install Coturn (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install coturn
```

### Configure Coturn

1. Edit the configuration file:

```bash
sudo nano /etc/turnserver.conf
```

2. Add the following configuration:

```conf
# Basic TURN server configuration
listening-port=3478
tls-listening-port=5349

# External IP (replace with your server's public IP)
external-ip=YOUR_PUBLIC_IP

# TURN server realm
realm=your-domain.com

# Authentication
# Option 1: Static credentials
user=your-username:your-password

# Option 2: Use database for user management
# userdb=/var/lib/turn/turndb

# SSL/TLS certificates (for TURNS)
cert=/path/to/your/certificate.pem
pkey=/path/to/your/private-key.pem

# Logging
log-file=/var/log/turnserver.log
verbose

# Security settings
fingerprint
lt-cred-mech
no-cli
no-loopback-peers
no-multicast-peers

# Relay settings
min-port=10000
max-port=20000

# Process management
pidfile=/var/run/turnserver.pid
```

3. Start the TURN server:

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

4. Check the status:

```bash
sudo systemctl status coturn
```

### Firewall Configuration

Open the necessary ports:

```bash
# TURN server ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Relay ports range
sudo ufw allow 10000:20000/udp
```

## Option 2: Docker Setup

Create a `docker-compose.yml` file:

```yaml
version: "3.8"
services:
  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478/tcp"
      - "3478:3478/udp"
      - "5349:5349/tcp"
      - "5349:5349/udp"
      - "10000-20000:10000-20000/udp"
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf
    restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
```

## Option 3: Cloud Providers

### AWS EC2

1. Launch an EC2 instance (t3.micro is sufficient for small deployments)
2. Configure security groups to allow TURN ports
3. Install and configure Coturn as above
4. Use Elastic IP for consistent external IP

### Google Cloud Platform

1. Create a Compute Engine instance
2. Configure firewall rules for TURN ports
3. Install and configure Coturn

### Digital Ocean

1. Create a droplet
2. Configure firewall
3. Install Coturn

## Testing Your TURN Server

### Using the Application

1. Set your environment variables in `.env.local`:

```bash
NEXT_PUBLIC_TURN_URLS=turn:your-server.com:3478,turns:your-server.com:5349
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-password
```

2. Use the TURN Server Setup component in your application to test connectivity.

### Manual Testing

Use `turnutils_uclient` (comes with coturn):

```bash
turnutils_uclient -T -u your-username -w your-password your-server.com
```

### Online Testing Tools

- WebRTC Troubleshooter: https://test.webrtc.org/
- Trickle ICE: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

## Security Considerations

1. **Use Strong Credentials**: Generate secure usernames and passwords
2. **Enable TLS**: Always use TURNS (TLS) in production
3. **Restrict Access**: Configure firewall rules appropriately
4. **Monitor Usage**: Set up logging and monitoring
5. **Rate Limiting**: Configure to prevent abuse

## Performance Optimization

1. **Resource Allocation**:

   - CPU: 1-2 cores for small deployments
   - RAM: 1-2 GB minimum
   - Bandwidth: Consider relay traffic overhead

2. **Network Optimization**:
   - Place TURN server geographically close to users
   - Use multiple TURN servers for redundancy
   - Configure appropriate relay port ranges

## Troubleshooting

### Common Issues

1. **Connection Refused**:

   - Check firewall settings
   - Verify TURN server is running
   - Check external IP configuration

2. **Authentication Failures**:

   - Verify username/password
   - Check realm configuration
   - Review TURN server logs

3. **TLS/TURNS Issues**:
   - Verify SSL certificate validity
   - Check certificate path in config
   - Ensure proper TLS port configuration

### Logs

Check TURN server logs:

```bash
sudo tail -f /var/log/turnserver.log
```

## Environment Variables Reference

```bash
# Required for custom TURN server
NEXT_PUBLIC_TURN_URLS=turn:your-server.com:3478,turns:your-server.com:5349
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-password

# Optional
NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302
NEXT_PUBLIC_ICE_TRANSPORT_POLICY=all
```

## Multiple TURN Servers

For redundancy, you can configure multiple TURN servers:

```bash
NEXT_PUBLIC_TURN_URLS=turn:turn1.your-domain.com:3478,turn:turn2.your-domain.com:3478,turns:turn1.your-domain.com:5349,turns:turn2.your-domain.com:5349
```

## Cost Considerations

- **Self-hosted**: Server costs + bandwidth
- **Cloud**: Instance costs + data transfer charges
- **Third-party**: Services like Twilio, Agora provide managed TURN servers

## Need Help?

If you encounter issues:

1. Check the TURN server logs
2. Use the built-in connectivity test in the application
3. Verify firewall and network configuration
4. Test with online WebRTC testing tools
