export type ProcessResult = {
    success: boolean;
    message?: string;
    data?: any;
};

export type AuthUser = {
    email: string;
    name: string;
    picture: string;
    sub: string;
};
