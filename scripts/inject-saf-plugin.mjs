import fs from 'fs';
import path from 'path';

export function injectSafPlugin() {
  const androidDir = path.resolve('android');
  if (!fs.existsSync(androidDir)) {
    console.log('[SAF Plugin] Pasta android/ ainda não existe, injeção será executada durante a criação do projeto Android.');
    return;
  }

  const javaDir = path.resolve('android/app/src/main/java/com/gkd/controlediario');
  if (!fs.existsSync(javaDir)) {
    fs.mkdirSync(javaDir, { recursive: true });
  }

  // 1. Criar SafStoragePlugin.java
  const pluginPath = path.join(javaDir, 'SafStoragePlugin.java');
  const pluginCode = `package com.gkd.controlediario;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "SafStorage")
public class SafStoragePlugin extends Plugin {

    private String pendingData = null;
    private String pendingFileName = null;
    private String pendingMimeType = "application/json";

    @PluginMethod
    public void saveFileToFolder(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "application/json");

        if (data == null || fileName == null) {
            call.reject("Dados ou nome do arquivo não informados");
            return;
        }

        this.pendingData = data;
        this.pendingFileName = fileName;
        this.pendingMimeType = mimeType;

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION 
                      | Intent.FLAG_GRANT_WRITE_URI_PERMISSION 
                      | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION 
                      | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);

        startActivityForResult(call, intent, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Backup cancelado");
            return;
        }

        Intent data = result.getData();
        Uri treeUri = data.getData();
        if (treeUri == null) {
            call.reject("Nenhuma pasta foi selecionada");
            return;
        }

        try {
            getContext().getContentResolver().takePersistableUriPermission(
                treeUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );
        } catch (Exception ignored) {}

        try {
            DocumentFile pickedDir = DocumentFile.fromTreeUri(getContext(), treeUri);
            if (pickedDir == null || !pickedDir.canWrite()) {
                call.reject("Não foi possível gravar na pasta selecionada");
                return;
            }

            DocumentFile existingFile = pickedDir.findFile(pendingFileName);
            if (existingFile != null) {
                try {
                    existingFile.delete();
                } catch (Exception ignored) {}
            }

            DocumentFile newFile = pickedDir.createFile(pendingMimeType, pendingFileName);
            if (newFile == null) {
                call.reject("Não foi possível criar o arquivo na pasta");
                return;
            }

            OutputStream out = getContext().getContentResolver().openOutputStream(newFile.getUri());
            if (out != null) {
                out.write(pendingData.getBytes(StandardCharsets.UTF_8));
                out.flush();
                out.close();
            } else {
                call.reject("Falha ao abrir fluxo de escrita");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("fileName", pendingFileName);
            ret.put("uri", newFile.getUri().toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao salvar arquivo na pasta: " + e.getMessage());
        } finally {
            pendingData = null;
            pendingFileName = null;
        }
    }
}
`;
  fs.writeFileSync(pluginPath, pluginCode, 'utf8');
  console.log('✅ SafStoragePlugin.java injetado com sucesso!');

  // 2. Registrar no MainActivity.java
  const mainActivityPath = path.join(javaDir, 'MainActivity.java');
  const mainActivityCode = `package com.gkd.controlediario;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafStoragePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
  fs.writeFileSync(mainActivityPath, mainActivityCode, 'utf8');
  console.log('✅ MainActivity.java configurado com registro de SafStoragePlugin!');

  // 3. Adicionar androidx.documentfile:documentfile ao build.gradle do App
  const appGradlePath = path.resolve('android/app/build.gradle');
  if (fs.existsSync(appGradlePath)) {
    let gradle = fs.readFileSync(appGradlePath, 'utf8');
    if (!gradle.includes('androidx.documentfile:documentfile')) {
      gradle = gradle.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation "androidx.documentfile:documentfile:1.0.1"`
      );
      fs.writeFileSync(appGradlePath, gradle, 'utf8');
      console.log('✅ Dependência androidx.documentfile adicionada ao android/app/build.gradle');
    }
  }
}

injectSafPlugin();
