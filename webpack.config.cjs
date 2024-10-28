const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const isProduction = process.env.NODE_ENV == 'production';

const config = {
    entry: './src/index.ts',
    output: {
        filename: 'battleship.js',
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
    externals: [
        nodeExternals({
            allowlist: [/\.(css|less|scss|json|ts|js|node_modules)/],
        }),
        { bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' },
    ],
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
