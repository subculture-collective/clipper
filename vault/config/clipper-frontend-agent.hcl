pid_file = "/vault-agent/pid/clipper-frontend-agent.pid"

auto_auth {
  method "approle" {
    config = {
      role_id_file_path   = "/run/secrets/clipper_frontend_role_id"
      secret_id_file_path = "/run/secrets/clipper_frontend_secret_id"
    }
  }

  sink "file" {
    config = {
      path = "/vault-agent/token"
    }
  }
}

vault {
  address               = "https://vault.subcult.tv"
  unwrap_token          = true
  retry {
    num_retries = 5
  }
}

template {
  source      = "/vault-agent/templates/frontend.env.ctmpl"
  destination = "/vault-agent/rendered/frontend.env"
  perms       = "0640"
  left_delimiter  = "{{"
  right_delimiter = "}}"
}
