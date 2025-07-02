provider "azurerm" {
  features {}
}

# Reference the existing resource group
data "azurerm_resource_group" "rg" {
  name = "DevOpsSkillsPracticeProjects"
}

# Reference the existing storage account
data "azurerm_storage_account" "storage" {
  name                = "raresonalcloudresume"
  resource_group_name = data.azurerm_resource_group.rg.name
}

# No need to create the container if you made it manually

# Use remote backend in Azure
terraform {
  backend "azurerm" {
    resource_group_name   = "DevOpsSkillsPracticeProjects"
    storage_account_name  = "raresonalcloudresume"
    container_name        = "shiptivitas-statefile-container"
    key                   = "terraform.tfstate"
  }
}
