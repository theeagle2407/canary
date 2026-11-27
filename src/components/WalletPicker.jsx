import React from 'react';
import {Dialog} from '@animate-ui/react/primitives/radix-ui';
import {Wallet,ChevronRight,X,RefreshCw} from 'lucide-react';
import './wallet-picker.css';
export default function WalletPicker({wallets,busy,error,close,select,refresh,local,network}){
  return <Dialog.Root open onOpenChange={v=>{if(!v&&!busy)close()}}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="modal dialog-content wallet-picker" onEscapeKeyDown={e=>{if(busy)e.preventDefault()}} onPointerDownOutside={e=>{if(busy)e.preventDefault()}}>
    <div className="panel-head"><Dialog.Title asChild><h2>Connect wallet</h2></Dialog.Title><button className="icon-button" aria-label="Close" onClick={close} disabled={!!busy}><X size={20}/></button></div>
    <Dialog.Description className="wallet-picker-desc">Choose a wallet to continue.</Dialog.Description>
    <div className="wallet-picker-list">
      {local?<button className="wallet-picker-row" disabled={!!busy} onClick={()=>select({name:'Local wallet',provider:null})}><Wallet size={19}/><b>Local wallet</b><ChevronRight size={16}/></button>:wallets.map(w=><button key={w.id} className="wallet-picker-row" disabled={!!busy} onClick={()=>select(w)}><span className="wallet-picker-icon"><Wallet size={18}/></span><span className="wallet-picker-name"><b>{w.name}</b><small>Detected</small></span><ChevronRight size={16}/></button>)}
      {!local&&!wallets.length&&<div className="wallet-picker-empty">No browser wallets detected.<small>Enable an EVM wallet extension and refresh detection.</small></div>}
      {busy&&<p className="wallet-picker-message" role="status">Confirm in {busy}…</p>}
      {error&&<p className="wallet-picker-error" role="alert">{error}</p>}
    </div>
    {!local&&<div className="wallet-picker-footer"><button className="btn outline small" onClick={refresh} disabled={!!busy}><RefreshCw size={14}/> Refresh wallets</button><span>{network}</span></div>}
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}
