const mongoose = require('mongoose');
const config = require('../config');
const EnvVar = require('./mongodbenv');

const defaultEnvVariables = [
    { key: 'ALIVE_IMG', value: 'https://thumbs.dreamstime.com/b/halloween-ghost-clipart-background-ghost-silhouette-halloween-ghost-logo-isolated-white-background-vector-template-halloween-330896848.jpg' },
    { key: 'ALIVE_MSG', value: '👻 Hello , I am alive now!!\n\n> Developer note \n\n> This whatsapp bot is not a complicated whatsapp bot and I have considered the convenience of the people I use here.\n\n> 💀CREATED by Nadeela Chamath💀' },
    { key: 'PREFIX', value: '.' },
];

// MongoDB connection function
const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB);
        console.log('🛜 MongoDB Connected ✅');

        // Check and create default environment variables
        for (const envVar of defaultEnvVariables) {
            const existingVar = await EnvVar.findOne({ key: envVar.key });

            if (!existingVar) {
                // Create new environment variable with default value
                await EnvVar.create(envVar);
                console.log(`➕ Created default env var: ${envVar.key}`);
            }
        }

    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
