// src/constants/aula.ts
export const AULA_OAUTH = {
  authorizationUrl:
    'https://login.aula.dk/simplesaml/module.php/oidc/authorize.php',
  tokenUrl:
    'https://login.aula.dk/simplesaml/module.php/oidc/token.php',
  clientId: '_99949a54b8b65423862aac1bf629599ed64231607a',
  redirectUri: 'https://app-private.aula.dk',
  scope: 'aula-sensitive',
} as const;

export const AULA_API_BASE = 'https://app-private.aula.dk/api/v22';

export const AULA_METHODS = {
  profilesByLogin: 'profiles.getProfilesByLogin',
  profileContext: 'profiles.getProfileContext',
} as const;
