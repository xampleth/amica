import { useTranslation } from 'react-i18next';

import { BasicPage, FormRow, NotUsingAlert } from './common';
import { prefixed, updateConfig } from "@/utils/config";
import { SwitchBox } from "@/components/switchBox"
import { IconButton } from '../iconButton';
import { useContext, useEffect, useState } from 'react';
import { ChatContext } from '@/features/chat/chatContext';
import { handleConfig } from '@/features/externalAPI/externalAPI';


export function ExternalAPIPage({
    externalApiEnabled,
    jwtOutdated,
    setExternalApiEnabled,
    setJwtOutdated,
    setSettingsUpdated,
}: {
    externalApiEnabled: boolean;
    jwtOutdated: boolean;
    setExternalApiEnabled: (amicaLifeEnabled: boolean) => void;
    setJwtOutdated: (jwtOutdated: boolean) => void;
    setSettingsUpdated: (updated: boolean) => void;
}) {

    const { t } = useTranslation();
    const { chat: bot } = useContext(ChatContext);
    const [jwtToken, setJwtToken] = useState(localStorage.getItem(prefixed("jwt_token")))

    useEffect(() => {
        if (externalApiEnabled === true) {
            bot.initSSE();
        } else {
            bot.closeSSE();
        }
    }, [externalApiEnabled]);

    const handleRefreshJwtToken = async () => {
        const token = await handleConfig("init");
        setJwtToken(token!);
        localStorage.setItem(prefixed("jwt_token"), token!);
        setJwtOutdated(false);
        updateConfig("jwt_outdated", "false");
    }

    return (
        <BasicPage
            title={`${t("External API")} ${t("Settings")}`}
            description={`${t("Enables")} ${t("Only in development mode")}`}
        >
            {jwtOutdated && (
                <NotUsingAlert>
                    Your settings have been updated. Refresh the config jwt token or current settings will not be used.
                </NotUsingAlert>
            )}
            <ul role="list" className="divide-y divide-gray-100 max-w-xs">
                <li className="py-4">
                    <FormRow label={`${t("Use")} ${t("External API")}`}>
                        <SwitchBox
                            value={externalApiEnabled}
                            label={`${t("External API")} ${t("Enabled")} ${t("(Disable to improve performance)")}`}
                            onChange={(value: boolean) => {
                                setExternalApiEnabled(value);
                                updateConfig("external_api_enabled", value.toString());
                                setSettingsUpdated(true);
                            }}
                        />
                    </FormRow>
                </li>

                {externalApiEnabled && (
                    <>

                        <li className="py-4">
                            <FormRow label={t("Config JWT Token")}>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="text"
                                        className="inline-flex items-center px-2 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-fuchsia-600 bg-fuchsia-100 hover:bg-fuchsia-200 focus:outline-transparent focus:border-transparent disabled:opacity-50 disabled:hover:bg-fuchsia-50 disabled:cursor-not-allowed hover:cursor-copy"
                                        value={jwtToken ?? "No token generated"}
                                        readOnly
                                        onClick={(e) => {
                                            // @ts-ignore
                                            navigator.clipboard.writeText(e.target.value);
                                        }}
                                    />
                                    <IconButton
                                        iconName="24/Reload"
                                        label={!jwtOutdated ? "Synced" :"Refresh"}
                                        isProcessing={false}
                                        disabled={!jwtOutdated}
                                        className="block h-9 w-auto rounded-md border-0 py-1.5 px-4 bg-secondary hover:bg-secondary-hover active:bg-secondary-active text-sm text-white ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                                        onClick={handleRefreshJwtToken}
                                    ></IconButton>
                                </div>
                            </FormRow>
                        </li>
                    </>
                )}
            </ul>
        </BasicPage>
    );
}