<template>
    <div class="coach-editor-wrapper">
        <DataTable :value="coachModel" stripedRows 
            sortMode="multiple" removableSort
            :paginator="true" :rows="10" :rowsPerPageOptions="[10,20,50]"
            v-model:filters="filters" filterDisplay="menu" :loading="isLoading"
            :scrollable="true" scrollHeight="flex"
            editMode="cell" @cellEditInit="onCellEditInit">
            <Column header="Portrait">
                <template #body="slotProps">
                    <img class="img-preview" :src="slotProps.data.portrait" alt="" @click="onPreviewClicked" />
                </template>
            </Column>
            <Column field="firstName" header="First name" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
                <template #editor="slotProps">
                    <InputText v-model="slotProps.data[slotProps.column.props.field]" style="width: 100%; z-index: 101" 
                        :class="{ 'p-invalid': editorIsInvalid }" @blur="onBlur" />
                </template>
            </Column>
            <Column field="lastName" header="Last name" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
                <template #editor="slotProps">
                    <InputText v-model="slotProps.data[slotProps.column.props.field]" style="width: 100%; z-index: 101" 
                        :class="{ 'p-invalid': editorIsInvalid }" @blur="onBlur" />
                </template>
            </Column>
            <Column field="position.short" header="Position" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
                <template #editor="slotProps">
                    <Dropdown v-model="slotProps.data.position.short" :filter="true"
                        :options="positionValues" optionLabel="name" optionValue="name" placeholder="Position" />
                </template>
            </Column>
            <Column field="team.nickName" header="Team" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..." />
                </template>
                <template #editor="slotProps">
                    <Dropdown v-model="slotProps.data.team.nickName" :filter="true"
                        :options="teamValues" optionLabel="name" optionValue="name" placeholder="Team" />
                </template>
            </Column>
            <Column field="overall" header="Overall" :sortable="true" dataType="numeric">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
                <template #editor="slotProps">
                    <InputText v-model="slotProps.data[slotProps.column.props.field]" style="width: 100%; z-index: 101" 
                        :class="{ 'p-invalid': editorIsInvalid }" @blur="onBlur" />
                </template>
            </Column> 
        </DataTable>
    </div>
</template>

<script>
import Column from 'primevue/column';
import Dropdown from 'primevue/dropdown';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import { FilterMatchMode, FilterOperator } from 'primevue/api';

export default {
    name: 'CoachEditor',

    components: {
        Column,
        Dropdown,
        DataTable,
        InputText,
        MultiSelect
    },

    props: {
        coachModel: Array
    },

    created() {
        this.initializeData();
    },

    data() {
        return {
            filters: {
                firstName: { value: null, matchMode: FilterMatchMode.CONTAINS },
                lastName: { value: null, matchMode: FilterMatchMode.CONTAINS },
                'position.short': { value: null, matchMode: FilterMatchMode.CONTAINS },
                'team.nickName': { value: null, matchMode: FilterMatchMode.CONTAINS },
                overall: { value: null, matchMode: FilterMatchMode.EQUALS },
            },
            teamValues: [],
            positionValues: [],
            editingCellRows: {},
            editorIsInvalid: false,
            isLoading: this.coachModel.length === 0
        }
    },

    methods: {
        initializeData() {
            this.positionValues = [];
            this.coachModel.forEach((coach) => {
                const position = this.positionValues.find((pos) => {
                    return pos.name === coach.position.short;
                });

                if (!position) {
                    this.positionValues.push({
                        name: coach.position.short
                    });
                }
            });

            this.teamValues = [];
            this.coachModel.forEach((coach) => {
                const team = this.teamValues.find((team) => {
                    return team.name === coach.team.nickName;
                });

                if (!team) {
                    this.teamValues.push({
                        name: coach.team.nickName
                    });
                }
            });
        },

        onCellEditComplete(event) {
            if (!this.editingCellRows[event.index]) {
                return;
            }

            const editingColumn = this.selectedColumns.find((col) => {
                return col.field === event.field;
            });

            const oldValue = this.tableModel[event.index][event.field];
            let editingCellValue = this.editingCellRows[event.index][event.field];

            if (editingCellValue != this.tableModel[event.index][event.field]) {
                const newValue = {...this.editingCellRows[event.index]};
                let isChanged = false;
                let isInvalid = false;
     
                switch(editingColumn.type) {
                    case 'text':
                        if (editingCellValue.length <= this.schema[editingColumn.field]) {
                            this.tableModel[event.index] = newValue;

                            isChanged = true;
                            this.editorIsInvalid = false;
                        }
                        else {
                            isInvalid = true;
                            this.editingCellRows[event.index][event.field] = this.tableModel[event.index][event.field];
                        }

                        break;
                    case 'numeric':
                    default:
                        if (isNumeric(editingCellValue)) {
                            editingCellValue = parseInt(editingCellValue);

                            if (editingCellValue <= this.schema[editingColumn.field]) {
                                this.editingCellRows[event.index][event.field] = editingCellValue;
                                this.tableModel[event.index] = newValue;

                                isChanged = true;
                            }
                            else {
                                isInvalid = true;
                                this.editingCellRows[event.index][event.field] = this.tableModel[event.index][event.field];
                            }
                        }
                        else {
                            this.editingCellRows[event.index][event.field] = this.tableModel[event.index][event.field];
                        }
                        break;
                }

                if (isChanged) {
                    this.$emit('cell-change', {
                        'field': event.field,
                        'row': event.index,
                        'newValue': editingCellValue,
                        'oldValue': oldValue
                    });
                }
                else if (isInvalid) {
                    this.$emit('invalid-change', {
                        'field': event.field,
                        'value': editingCellValue,
                        'maxValue': this.schema[editingColumn.field],
                        'type': editingColumn.type
                    });
                }
            }

            this.editingCellRows = {};
        },

        onCellEdit(newValue, props) {
            this.editingCellRows[props.index] = {...props.data};
            this.editingCellRows[props.index][props.column.props.field] = newValue;
        },

        onCellEditInit(params) {
            setTimeout(() => {
                const input = params.originalEvent.srcElement.querySelector('input');
                input.focus();
                input.select();
            }, 25);
        },

        onCellEditCancel() {
            
        },

        onBlur(e) {
            e.preventDefault();
            document.dispatchEvent(new Event('click'));
        },
    },

    unmounted() {

    },

    watch: {
        coachModel() {
            if (this.coachModel.length === 0) {
                this.isLoading = true;
            }
            else {
                this.isLoading = false;
            }

            this.initializeData();
        }
    }
}
</script>

<style lang="scss">
    .img-preview {
        height: 100px;
        width: 100px;
    }
</style>