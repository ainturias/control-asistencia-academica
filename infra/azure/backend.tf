terraform {
  backend "azurerm" {
    resource_group_name  = "rg-asistencia-diplomado-m2"
    storage_account_name = "tfstatediploainturias"
    container_name       = "tfstate"
    key                  = "diplomado.terraform.tfstate"
  }
}
