import {FileObject} from "@/api/server/files/loadDirectory";
import {ServerContext} from "@/state/server";
import renameFiles from '@/api/server/files/renameFiles';
import useFlash from '@/plugins/useFlash';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import Switch from '@/components/elements/Switch';
import Can from '@/components/elements/Can';
import tw from 'twin.macro';
import React from "react";

const FileObjectName = ({file}: {file: FileObject}) => {
    // const [ showSpinner, setShowSpinner ] = useState(false);

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const { mutate } = useFileManagerSwr();
    const { clearAndAddHttpError, clearFlashes } = useFlash();
    const directory = ServerContext.useStoreState((state) => state.files.directory);

    const onPluginSwitch = () => {
        // setShowSpinner(true);
        clearFlashes('files');
        const newFileName = file.name.endsWith('.jar') ? file.name + '.disabled' : file.name.slice(0, file.name.indexOf('.jar') + 4);
        renameFiles(uuid, directory, [ { from: file.name, to: newFileName } ])
            .then(() => mutate())
            .catch(error => clearAndAddHttpError({ key: 'files', error }))
            // .then(() => setShowSpinner(false));
    };

    return (
        <>
            {file.isFile && file.name.includes('.jar') && (directory.includes('plugins') || directory.includes('mods')) ?
                <>
                    <div css={tw`flex-1 truncate`}
                         style={{
                             color: file.name.endsWith('.jar') ? 'inherit' : '#EF5350',
                         }}
                    >
                        { file.name.slice(0, file.name.indexOf('.jar') + 4) }
                    </div>
                    <Can action={'file.update'}>
                        <Switch name={'plugin_enabled'} defaultChecked={file.name.endsWith('.jar')}
                                onChange={onPluginSwitch}
                        />
                    </Can>
                </>
                :
                <div css={tw`flex-1 truncate`}>
                    {file.name}
                </div>
            }
        </>
    );
};

export default FileObjectName;
