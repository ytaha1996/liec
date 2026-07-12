export interface IUser {
  email: string;
  active: boolean;
  username: string;
  mobileNumber: string;
}

export interface IUserStore {
  token: string;
  active: boolean;
  role: string;
  isAuthenticated: boolean;
  user: IUser;
}
