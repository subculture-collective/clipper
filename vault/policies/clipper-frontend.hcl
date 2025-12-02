# Policy for Clipper Frontend AppRole
# Grants read-only access to the frontend secrets in KV v2

path "kv/data/clipper/frontend" {
  capabilities = ["read"]
}

path "kv/metadata/clipper/frontend" {
  capabilities = ["read", "list"]
}
