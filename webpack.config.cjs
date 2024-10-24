const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const isProduction = process.env.NODE_ENV == 'production';

const config = {
    entry: './src/index.ts',
    output: {
        filename: 'CRUD-API-app.js',
        path: path.resolve(__dirname, 'build'),
    },
    plugins: [
        new CleanWebpackPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.ts$/i,
                loader: 'ts-loader',
                include: [path.resolve(__dirname, 'src')],
                exclude: ['/node_modules/', '/build/'],
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    target: 'node',
    stats: {
        all: false,
        assets: true,
        builtAt: true,
        // cached: false,
        errors: true,
        warnings: true,
        modules: false,
        // moduleTrace: true,
        performance: true,
        errorDetails: true,
        reasons: false,
    },
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
    } else {
        config.mode = 'development';
    }
    return config;
};
