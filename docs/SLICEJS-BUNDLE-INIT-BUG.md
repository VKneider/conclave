# Slice.js Bundle Init Bug

## Framework bug

Source: `node_modules/slicejs-web-framework@4.0.0/Slice/Slice.js`

### Causa

El método `init()` del runtime principal tiene un error de orden de inicialización: carga los bundles *antes* de inicializar `slice.logger`, pero `Controller.loadBundle()` (codificado en el framework bundle) llama internamente a `slice.logger.logWarning()`.

```
  // init() ~línea 470–537 (orden real)
  1. slice.controller.loadBundle('critical')   // ← usa slice.logger.logWarning()
  2. slice.logger = new LoggerModule()          // ← slice.logger recién existe acá
```

### Síntoma

```
[Slice.js] Initialization failed:
  Error: Bundling V2 initialization failed (critical bundle "slice-bundle.critical.js"):
    Cannot read properties of undefined (reading 'logWarning')
Caused by: TypeError: Cannot read properties of undefined (reading 'logWarning')
  at Controller.loadBundleWithDependencies (slice-bundle.framework.js)
```

Ocurre solo en **producción** (`pnpm run build` → abrir `dist/`). En desarrollo (`pnpm run dev`) no hay bundles, por lo que el bug nunca se dispara.

### Fix propuesto para upstream

En `Slice.js`, mover la inicialización del logger **antes** del bloque de carga de bundles:

```diff
+      // Logger first — Controller.loadBundle() calls slice.logger.logWarning() internally
+      if (sliceConfig.logger.enabled) {
+         const LoggerModule = window.slice.frameworkClasses?.Logger
+           || await window.slice.getClass(`${slice.paths.structuralComponentFolderPath}/Logger/Logger.js`);
+         window.slice.logger = new LoggerModule();
+      } else {
+         const noop = () => {};
+         window.slice.logger = {
+            error: noop, warn: noop, info: noop, debug: noop,
+            logError: noop, logWarning: noop, logInfo: noop,
+         };
+      }
+
       // Initialize bundles before building components.
       if (resolvedMode === 'production' && window.slice.controller.bundleConfig) {
         await window.slice.controller.loadBundle('critical');
         // ...
       }

-      // Logger setup (currently AFTER bundle loading — wrong)
-      if (sliceConfig.logger.enabled) {
-        window.slice.logger = new LoggerModule();
-      }
```

## Workaround local

`scripts/copy-slice.js` aplica un parche post-copia: inserta un noop logger en el bloque correcto antes del bundle loading. El parche se re-aplica automáticamente en cada `pnpm run build`.

Si el framework se actualiza y el marker `// Initialize bundles before building components.` deja de existir, el script cae a `copyFileSync` sin parche y el bug reaparecerá. En ese caso, verificar contra la nueva versión y actualizar el marker.
