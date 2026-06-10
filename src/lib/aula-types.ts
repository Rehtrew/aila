// src/lib/aula-types.ts
export interface AulaInstitutionProfile {
  institutionName: string;
  institutionCode: string;
  role: string;
}

export interface AulaProfile {
  profileId: number;
  displayName: string;
  institutionProfiles: AulaInstitutionProfile[];
}

export interface AulaChild {
  profileId: number;
  displayName: string;
  currentUniRole: string;
  institutionProfiles: AulaInstitutionProfile[];
}

export interface ProfilesByLoginResponse {
  data: {
    profiles: AulaProfile[];
  };
}

export interface ProfileContextResponse {
  data: {
    children: AulaChild[];
  };
}
