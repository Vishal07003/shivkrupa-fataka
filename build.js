import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBuild() {
  console.log('⚡ Starting React + Tailwind CSS Production Bundle via esbuild...');
  const outDir = path.resolve(__dirname, 'dist');
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Compile Tailwind CSS through PostCSS
  const rawCss = fs.readFileSync(path.resolve(__dirname, 'src/index.css'), 'utf8');
  const tailwindConfigPath = path.resolve(__dirname, 'tailwind.config.js');
  
  console.log('📦 Compiling Tailwind CSS design system...');
  const postCssResult = await postcss([
    tailwindcss(tailwindConfigPath),
    autoprefixer()
  ]).process(rawCss, {
    from: path.resolve(__dirname, 'src/index.css'),
    to: path.resolve(outDir, 'assets/index.css'),
  });

  const assetsDir = path.resolve(outDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  fs.writeFileSync(path.resolve(assetsDir, 'index.css'), postCssResult.css);
  console.log('✓ CSS compiled to dist/assets/index.css');

  // 2. Bundle React 18 JSX application with esbuild
  console.log('📦 Bundling React 18 frontend components & pages...');
  const esbuildResult = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'src/main.jsx')],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'esm',
    target: ['es2020'],
    outfile: path.resolve(assetsDir, 'index.js'),
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.VITE_API_URL': '"http://127.0.0.1:8000/api"'
    },
    loader: {
      '.js': 'jsx',
      '.jsx': 'jsx',
      '.css': 'empty'
    }
  });

  if (esbuildResult.errors.length > 0) {
    console.error('Build errors:', esbuildResult.errors);
    process.exit(1);
  }
  console.log('✓ JS bundled to dist/assets/index.js');

  // 3. Generate production index.html
  let indexHtml = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  indexHtml = indexHtml.replace(
    '</head>',
    '  <link rel="stylesheet" href="./assets/index.css">\n  </head>'
  );
  indexHtml = indexHtml.replace(
    '<script type="module" src="/src/main.jsx"></script>',
    '<script type="module" src="./assets/index.js"></script>'
  );
  fs.writeFileSync(path.resolve(outDir, 'index.html'), indexHtml);
  console.log('✓ Production index.html generated in dist/');

  console.log('🎉 Production build completed successfully in dist/!');
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
