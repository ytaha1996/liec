export interface IApplicationModule {
  name: string;
  route: string;
  title: string;
  hidden?: boolean;
  isDropdown?: boolean;
  subModules?: IApplicationModule[];
}

export interface IApplication {
  title: string;
  description?: string;
  icon?: string;
  name: string;
  hidden?: boolean;
  route: string;
  modules: Record<string, IApplicationModule>;
}
