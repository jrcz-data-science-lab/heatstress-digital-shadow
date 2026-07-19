import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	transform: {
		'^.+\\.(t|j)sx?$': 'babel-jest',
	},
	transformIgnorePatterns: [],
	moduleNameMapper: {
		'\\.(css|less|sass|scss)$': '<rootDir>/test/__mocks__/styleMock.js',
		'\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/test/__mocks__/fileMock.js',
	},
};

export default config;
