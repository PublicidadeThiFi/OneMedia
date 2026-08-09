import { useCallback, type Dispatch, type SetStateAction } from 'react';
import apiClient from '../../lib/apiClient';
import type { AssistantImportSession } from '../../types/assistant';
export function useAssistantImport(session:AssistantImportSession|null,setSession:Dispatch<SetStateAction<AssistantImportSession|null>>){
  const editImportRow=useCallback(async(rowId:string,field:string,value:unknown)=>{if(!session)return;const {data}=await apiClient.post('/assistant/imports/rows/edit',{sessionId:session.sessionId,rowId,field,value});setSession(data)},[session,setSession]);
  const selectImportRows=useCallback(async(rowIds:string[],selected:boolean)=>{if(!session)return;const {data}=await apiClient.post('/assistant/imports/rows/select',{sessionId:session.sessionId,rowIds,selected});setSession(data)},[session,setSession]);
  const removeImportRow=useCallback(async(rowId:string,deleted:boolean)=>{if(!session)return;const {data}=await apiClient.post('/assistant/imports/rows/remove',{sessionId:session.sessionId,rowId,deleted});setSession(data)},[session,setSession]);
  const confirmImport=useCallback(async()=>{if(!session)return;const summary=`Confirmar importação\n\nTipo: ${session.importType}\nArquivo: ${session.sourceFile.name}\nRegistros: ${session.summary.total}\nSelecionados: ${session.summary.selected}\nInválidos: ${session.summary.invalid}\n\nA execução usa somente actions oficiais, pode ter sucesso parcial e não oferece rollback.`;if(!window.confirm(summary))return;const confirmation=await apiClient.post('/assistant/imports/confirm',{sessionId:session.sessionId});const {data}=await apiClient.post('/assistant/imports/execute',{sessionId:session.sessionId,confirmationId:confirmation.data.confirmationId});setSession(data)},[session,setSession]);
  const cancelImport=useCallback(async()=>{if(!session)return;const {data}=await apiClient.post('/assistant/imports/cancel',{sessionId:session.sessionId});setSession(data)},[session,setSession]);
  const retryImport=useCallback(async()=>{if(!session)return;const {data}=await apiClient.post('/assistant/imports/retry',{sessionId:session.sessionId});setSession(data)},[session,setSession]);
  return {editImportRow,selectImportRows,removeImportRow,confirmImport,cancelImport,retryImport};
}
