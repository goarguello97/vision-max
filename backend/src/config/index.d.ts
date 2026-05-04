interface Config {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    database: {
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    tmdb: {
        apiKey: string;
        baseUrl: string;
        imageUrl: string;
    };
    mockMode: boolean;
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map