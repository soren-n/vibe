"""JavaScript/Node.js/Web development workflows."""

from .core import Workflow

JAVASCRIPT_WORKFLOWS = {
    "js_quality": Workflow(
        name="js_quality",
        description="Run JavaScript/TypeScript code quality checks",
        triggers=[
            r"lint.*js",
            r"lint.*typescript",
            r"eslint",
            r"prettier",
            r"format.*js",
            r"check.*js.*quality",
        ],
        commands=[
            "npm run lint || npx eslint . || echo 'ESLint not configured'",
            "npm run format || npx prettier --write . || echo 'Prettier not configured'",
            "echo 'JavaScript code quality check completed'",
        ],
        project_types=["javascript", "typescript", "node"],
        conditions=["file:package.json", "pattern:*.js", "pattern:*.ts"],
    ),
    "js_test": Workflow(
        name="js_test",
        description="Run JavaScript/TypeScript tests",
        triggers=[
            r"run.*js.*tests",
            r"test.*javascript",
            r"jest.*test",
            r"vitest",
            r"mocha.*test",
            r"npm.*test",
        ],
        commands=[
            "npm test || yarn test || echo 'No test script configured'",
            "echo 'JavaScript test execution completed'",
        ],
        dependencies=["js_quality"],
        project_types=["javascript", "typescript", "node"],
        conditions=["file:package.json"],
    ),
    "js_type_check": Workflow(
        name="js_type_check",
        description="Run TypeScript type checking",
        triggers=[
            r"typescript.*check",
            r"tsc.*check",
            r"type.*check.*ts",
            r"check.*typescript",
        ],
        commands=[
            "npx tsc --noEmit || npm run type-check || echo 'TypeScript checking not configured'",
            "echo 'TypeScript type checking completed'",
        ],
        project_types=["typescript"],
        conditions=["file:tsconfig.json", "pattern:*.ts"],
    ),
    "js_install": Workflow(
        name="js_install",
        description="Install JavaScript dependencies",
        triggers=[
            r"npm.*install",
            r"yarn.*install",
            r"install.*node.*depend\w+",
            r"setup.*node",
            r"install.*packages",
        ],
        commands=[
            "npm install || yarn install || echo 'Could not install dependencies'",
            "echo 'JavaScript dependencies installation completed'",
        ],
        project_types=["javascript", "typescript", "node"],
        conditions=["file:package.json"],
    ),
    "js_build": Workflow(
        name="js_build",
        description="Build JavaScript/TypeScript project",
        triggers=[
            r"build.*js",
            r"build.*typescript",
            r"compile.*typescript",
            r"npm.*build",
            r"webpack.*build",
            r"vite.*build",
        ],
        commands=[
            "npm run build || yarn build || echo 'No build script configured'",
            "ls -la dist/ build/ 2>/dev/null || echo 'No build output directory found'",
            "echo 'JavaScript build completed'",
        ],
        dependencies=["js_test", "js_quality"],
        project_types=["javascript", "typescript", "node"],
        conditions=["file:package.json"],
    ),
    "js_dev": Workflow(
        name="js_dev",
        description="Start JavaScript development server",
        triggers=[
            r"start.*dev.*server",
            r"npm.*dev",
            r"yarn.*dev",
            r"development.*server",
            r"local.*server",
            r"serve.*app",
        ],
        commands=[
            "echo 'Starting development server...'",
            "npm run dev || yarn dev || npm start || echo 'No dev server script configured'",
        ],
        project_types=["javascript", "typescript", "node"],
        conditions=["file:package.json"],
    ),
    "js_audit": Workflow(
        name="js_audit",
        description="Audit JavaScript dependencies for security issues",
        triggers=[
            r"audit.*npm",
            r"security.*npm",
            r"check.*vulnerab\w+.*npm",
            r"npm.*audit",
        ],
        commands=[
            "npm audit || yarn audit || echo 'Could not run security audit'",
            "npm outdated || yarn outdated || echo 'Could not check outdated packages'",
            "echo 'JavaScript security audit completed'",
        ],
        project_types=["javascript", "typescript", "node"],
        conditions=["file:package.json"],
    ),
    "vue_dev": Workflow(
        name="vue_dev",
        description="Vue.js specific development workflows",
        triggers=[r"vue.*dev", r"start.*vue", r"vue.*serve", r"nuxt.*dev"],
        commands=[
            "npm run dev || yarn dev || vue-cli-service serve || echo 'Vue dev server not configured'",
            "echo 'Vue development server started'",
        ],
        project_types=["vue"],
        conditions=["file:package.json", "pattern:*.vue"],
    ),
    "react_dev": Workflow(
        name="react_dev",
        description="React.js specific development workflows",
        triggers=[r"react.*dev", r"start.*react", r"next.*dev", r"create.*react.*app"],
        commands=[
            "npm run dev || npm start || yarn dev || yarn start || echo 'React dev server not configured'",
            "echo 'React development server started'",
        ],
        project_types=["react"],
        conditions=["file:package.json", "pattern:*.jsx", "pattern:*.tsx"],
    ),
}
