export type VaultSkill = {
  id: string;
  name: string;
  description: string;
  content: string;
  builtin?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type VaultSkillInput = Pick<VaultSkill, "id" | "name" | "description" | "content">;
