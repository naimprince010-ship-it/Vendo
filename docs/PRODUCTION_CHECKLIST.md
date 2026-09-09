# Production Release Checklist

Complete this checklist for the actual deployment. Repository verification cannot pre-check environment-, operator-, or hardware-specific items.

- [ ] Production domain DNS resolves to the intended host
- [ ] Valid HTTPS/TLS certificate and renewal verified
- [ ] Database, JWT, host, and backup secrets generated independently and stored outside Git
- [ ] Production environment passes fail-fast validation
- [ ] PostgreSQL is private/not publicly exposed
- [ ] Fresh pre-deploy backup completed and checksum/catalog verified
- [ ] Backup copied to encrypted off-host storage
- [ ] Isolated restore drill completed and recorded
- [ ] All migrations reviewed, applied, and status current
- [ ] API liveness and database readiness return 200
- [ ] Initial owner created without a default/development password
- [ ] Company, currency, timezone, branch, warehouse, register, and payment methods configured
- [ ] Roles and permissions reviewed using least privilege
- [ ] Product conversions, batches, prices, and opening inventory reconciled
- [ ] Monitoring covers availability, 5xx, readiness, disk, database, backup age, and container restarts
- [ ] Structured logs retained securely and request-ID lookup tested
- [ ] Full operational smoke test completed on production-like data
- [ ] Cash shift opening/closing and expected/actual reconciliation tested
- [ ] Receipt and A4 invoice content reviewed
- [ ] Actual thermal printer/browser/driver combination accepted by the business
- [ ] Restore contacts, escalation path, RPO, and RTO approved
