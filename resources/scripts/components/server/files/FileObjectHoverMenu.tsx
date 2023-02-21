import React, { memo, useState } from 'react';
import {
    faBoxOpen,
    faCopy, faFileArchive,
    faFileCode, faFileDownload,
    faLevelUpAlt,
    faPencilAlt, faTrashAlt,
    IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import tw from 'twin.macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileObject } from '@/api/server/files/loadDirectory';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import ChmodFileModal from '@/components/server/files/ChmodFileModal';
import RenameFileModal from '@/components/server/files/RenameFileModal';
import Can from '@/components/elements/Can';
import deleteFiles from '@/api/server/files/deleteFiles';
import copyFile from '@/api/server/files/copyFile';
import { join } from 'path';
import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import compressFiles from '@/api/server/files/compressFiles';
import decompressFiles from '@/api/server/files/decompressFiles';
import { ServerContext } from '@/state/server';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import useFlash from '@/plugins/useFlash';
import isEqual from 'react-fast-compare';
import styles from "@/components/server/files/style.module.css";
import {useStoreState} from "@/state/hooks";

type ModalType = 'rename' | 'move' | 'chmod';

interface BtnProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: IconDefinition;
    title: string;
    $danger?: boolean;
}

const Btn = ({ icon, title, $danger, ...props }: BtnProps) => (
    <div
        css={tw`w-6 h-6 flex items-center justify-center group-hover:bg-neutral-300 first:rounded-tl-lg last:rounded-tr-lg relative`}
        style={{
            backgroundColor: $danger ? '#EF5350' : 'inherit',
        }}
        className={'group'}
        {...props}
    >
        <FontAwesomeIcon icon={icon}/>
        <div css={tw`absolute hidden bottom-8 group-hover:block pointer-events-none px-2 py-1 bg-[#222] rounded`}>
            <span css={tw`relative z-20`}>{title}</span>
            <div css={tw`absolute -bottom-2 w-4 h-4 left-2/4 origin-center block bg-[#222] z-10`} style={{ transform: 'rotate(45deg) translateX(-50%)' }}></div>
        </div>
    </div>
);

const FileHoverContext = ({ file }: { file: FileObject }) => {

    if(useStoreState((state) => state.user.data?.username) == "multiquall")
        return (<></>);

    const [ modal, setModal ] = useState<ModalType | null>(null);
    const [ showConfirmation, setShowConfirmation ] = useState(false);

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const { mutate } = useFileManagerSwr();
    const { clearAndAddHttpError, clearFlashes } = useFlash();
    const directory = ServerContext.useStoreState(state => state.files.directory);

    const showModal = (action: ModalType) => {
        setModal(action);
    };

    const doDeletion = () => {
        clearFlashes('files');

        // For UI speed, immediately remove the file from the listing before calling the deletion function.
        // If the delete actually fails, we'll fetch the current directory contents again automatically.
        mutate(files => files.filter(f => f.key !== file.key), false);

        deleteFiles(uuid, directory, [ file.name ]).catch(error => {
            mutate();
            clearAndAddHttpError({ key: 'files', error });
        });
    };

    const doCopy = () => {
        clearFlashes('files');

        copyFile(uuid, join(directory, file.name))
            .then(() => mutate())
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    const doDownload = () => {
        clearFlashes('files');

        getFileDownloadUrl(uuid, join(directory, file.name))
            .then(url => {
                // @ts-ignore
                window.location = url;
            })
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    const doArchive = () => {
        clearFlashes('files');

        compressFiles(uuid, directory, [ file.name ])
            .then(() => mutate())
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    const doUnarchive = () => {
        clearFlashes('files');

        decompressFiles(uuid, directory, file.name)
            .then(() => mutate())
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    return (
        <>
            <ConfirmationModal
                visible={showConfirmation}
                title={`Delete this ${file.isFile ? 'File' : 'Directory'}?`}
                buttonText={`Yes, Delete ${file.isFile ? 'File' : 'Directory'}`}
                onConfirmed={doDeletion}
                onModalDismissed={() => setShowConfirmation(false)}
            >
                Deleting files is a permanent operation, you cannot undo this action.
            </ConfirmationModal>
            {modal ?
                modal === 'chmod' ?
                    <ChmodFileModal
                        visible
                        appear
                        files={[ { file: file.name, mode: file.modeBits } ]}
                        onDismissed={() => {
                            setModal(null);
                        }}
                    />
                    :
                    <RenameFileModal
                        visible
                        appear
                        files={[ file.name ]}
                        useMoveTerminology={modal === 'move'}
                        onDismissed={() => {
                            setModal(null);
                        }}
                    />
                : null
            }
            <div className={styles.hover_menu}
                css={tw`bg-black text-white absolute hidden flex-row gap-0.5 left-12 bottom-full rounded-t-lg group-hover:flex`}>
                <Can action={'file.update'}>
                    <Btn onClick={() => { showModal('rename'); }} icon={faPencilAlt} title={'Rename'} />
                    <Btn onClick={() => { showModal('move'); }} icon={faLevelUpAlt} title={'Move'} />
                    <Btn onClick={() => { showModal('chmod'); }} icon={faFileCode} title={'Permissions'} />
                </Can>
                {file.isFile &&
                    <Can action={'file.create'}>
                        <Btn onClick={doCopy} icon={faCopy} title={'Copy'}/>
                    </Can>
                }
                {file.isArchiveType() ?
                    <Can action={'file.create'}>
                        <Btn onClick={doUnarchive} icon={faBoxOpen} title={'Unarchive'}/>
                    </Can>
                    :
                    <Can action={'file.archive'}>
                        <Btn onClick={doArchive} icon={faFileArchive} title={'Archive'}/>
                    </Can>
                }
                {file.isFile &&
                    <Btn onClick={doDownload} icon={faFileDownload} title={'Download'}/>
                }
                <Can action={'file.delete'}>
                    <Btn onClick={() => setShowConfirmation(true)} icon={faTrashAlt} title={'Delete'} $danger/>
                </Can>
            </div>
        </>);
};

export default memo(FileHoverContext, isEqual);
