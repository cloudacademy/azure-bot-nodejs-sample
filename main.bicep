@description('Azure region for the App Service resources.')
param location string

@description('Name of the App Service plan.')
param appServicePlanName string

@description('Name of the Web App.')
param webAppName string

@description('Name of the Azure Bot resource.')
param botName string

@description('Microsoft Entra application (client) ID.')
param appId string

@secure()
@description('Client secret for the Microsoft Entra application.')
param clientSecret string

@description('Microsoft Entra tenant ID.')
param tenantId string

resource appServicePlan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: 'S1'
    tier: 'Standard'
    size: 'S1'
    family: 'S'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2024-11-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    reserved: true
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      appCommandLine: 'node ./dist/index.js'
      alwaysOn: true
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'WEBSITES_PORT'
          value: '3978'
        }
        {
          name: 'connections__serviceConnection__settings__clientId'
          value: appId
        }
        {
          name: 'connections__serviceConnection__settings__clientSecret'
          value: clientSecret
        }
        {
          name: 'connections__serviceConnection__settings__tenantId'
          value: tenantId
        }
      ]
    }
  }
}

resource azureBot 'Microsoft.BotService/botServices@2023-09-15-preview' = {
  name: botName
  location: 'global'
  kind: 'azurebot'
  sku: {
    name: 'F0'
  }
  properties: {
    displayName: botName
    endpoint: 'https://${webApp.properties.defaultHostName}/api/messages'
    msaAppId: appId
    msaAppType: 'SingleTenant'
    msaAppTenantId: tenantId
    publicNetworkAccess: 'Enabled'
  }
}

output webAppHostname string = webApp.properties.defaultHostName
output botEndpoint string = 'https://${webApp.properties.defaultHostName}/api/messages'
