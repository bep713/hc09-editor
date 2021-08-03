<template>
    <DataTable :value="settings" stripedRows removableSort>
        <Column field="name" header="Name"></Column>
        <Column field="value" header="Value">
            <template #body="slotProps">
                <div class="value-container">
                    <InputText class="setting-value" type="text" v-model="slotProps.data.value" />
                    <span class="select-file-button" v-if="slotProps.data.type === 'file' || slotProps.data.type === 'folder'">
                        <Button class="p-button-outlined" label="Select..." @click="onFileSelect(slotProps.data)" />
                    </span>
                </div>
            </template>
        </Column>
    </DataTable>
</template>

<script>
import Button from 'primevue/button';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import DataTable from 'primevue/datatable';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

export default {
    name: 'SettingsView',

    components: {
        Button,
        Column,
        DataTable,
        InputText
    },

    props: {
        settings: Array
    },

    methods: {
        onFileSelect(setting) {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showOpenDialogAsync', asyncNode.getCurrentWindow(), {
                    properties: setting.type === 'file' ? ['openFile'] : ['openDirectory']
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths) {
                    this.onValueUpdate(setting.attributeKey, result.filePaths[0]);
                }
            }).catch((err) => {
                console.log(err);
            });
        },

        onValueUpdate(key, value) {
            const index = this.settings.findIndex((setting) => {
                return setting.attributeKey === key;
            });

            this.settings[index].value = value;
            this.$emit('change', {
                key: key,
                value: value
            });
        }
    } 
}
</script>

<style lang="scss" scoped>
    .select-file-button {
        margin-left: 10px;
    }

    @media (min-width: 961px) {
        .setting-value {
            min-width: calc(100% - 96.3px);
        }
    }
</style>