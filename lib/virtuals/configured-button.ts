import {VirtualComponent} from "esphome-config-ts/lib/base";
import {MatrixKeypadBinarySensor} from "esphome-config-ts/lib/components/matrix_keypad";
import {PartitionLight} from "esphome-config-ts/lib/components/partition";
import {HomeassistantSensor, HomeassistantTextSensor} from "esphome-config-ts/lib/components/homeassistant";
import {lambda} from "esphome-config-ts/lib/lambda";

export interface EditContainer {
    keyNum: number;
    component: ConfiguredButtonOpts;
    label: Label;
}

export interface Label {
    icon: string;
    text: string;
    fontSize: number;
}

export interface ConfiguredButtonOpts {
    num: number;

    expose: boolean;
    blip_on_press: boolean;

    ha_entity: string | null;
    toggle: boolean;
    follow_state: boolean;
    follow_brightness: boolean;
    follow_color: boolean;
}

type newConfiguredButtonOptsOpts = Partial<ConfiguredButtonOpts> & Pick<ConfiguredButtonOpts, 'num'>
export const newConfiguredButtonOpts = (opts: newConfiguredButtonOptsOpts): ConfiguredButtonOpts => ({
    num: opts.num,

    expose: opts.expose ?? true,
    blip_on_press: opts.blip_on_press ?? true,

    ha_entity: opts.ha_entity ?? null,
    toggle: opts.toggle ?? false,
    follow_state: opts.toggle ?? false,
    follow_brightness: opts.follow_brightness ?? false,
    follow_color: opts.follow_color ?? false
});

export const KEYS = "ABCDEFGHIJKLMNOPQRSTUVWX";
export const BUTTON_NUMBERS = [
    19, 20, 21, 22, 23, 24,
    13, 14, 15, 16, 17, 18,
    7, 8, 9, 10, 11, 12,
    1, 2, 3, 4, 5, 6,
];

export const lambdaBright = lambda('return (x/255) * id(brightness);');

export class ConfiguredButton extends VirtualComponent<EditContainer> {
    synth() {

        const c = this.config.component;
        const stack = [];

        let label = "";
        if (this.config.label) {
            label = " " + this.config.label.text.replace(/[\n_]+/g, ' ');
        }

        let sensor = new MatrixKeypadBinarySensor({
            id: `keypad_button_${c.num.toString().padStart(2, "0")}`,
            name: "Button " + c.num.toString().padStart(2, "0") + label,
            internal: !c.expose,
            keypad_id: 'keypad',
            key: KEYS[c.num - 1],
            disabled_by_default: true,
            on_press: [],
        });
        stack.push(sensor);

        if (c.expose) {
            stack.push(new PartitionLight({
                id: `keypad_button_${c.num.toString().padStart(2, "0")}_light`,
                name: "Button " + c.num.toString().padStart(2, "0") + label,
                disabled_by_default: true,
                // @ts-ignore - Segments expects single light id for some reason
                segments: [{
                    id: "ledstrip",
                    from: c.num - 1,
                    to: c.num - 1,
                }],
            }));
        }

        if (c.blip_on_press) {
            sensor.config.on_press?.push({'script.execute': {id: 'blip_light', led_index: c.num - 1}});
        }

        if (c.ha_entity && c.toggle) {
            sensor.config.on_press?.push({
                "homeassistant.service": {
                    service: "homeassistant.toggle",
                    data: {entity_id: c.ha_entity}
                }
            });
        }
        if (c.ha_entity && c.follow_state) {
            stack.push(new HomeassistantTextSensor({
                id: `keypad_button_${c.num}_hass`,
                entity_id: c.ha_entity,
                on_value: [{
                    "light.addressable_set": {
                        id: "ledstrip",
                        range_from: c.num - 1,
                        range_to: c.num - 1,
                        red: lambda('return (x == "on")?id(brightness):0;'),
                        green: lambda('return (x == "on")?id(brightness):0;'),
                        blue: lambda('return (x == "on")?id(brightness):0;'),
                        white: lambda('return (x == "on")?id(brightness):0;'),
                    }
                }]
            }));
        }

        if (c.ha_entity && c.follow_brightness) {
            stack.push(new HomeassistantSensor({
                id: `keypad_button_${c.num}_hass_brightness`,
                entity_id: c.ha_entity,
                attribute: "brightness",
                on_value: [{
                    "light.addressable_set": {
                        id: "ledstrip",
                        range_from: c.num - 1,
                        range_to: c.num - 1,
                        red: lambdaBright,
                        green: lambdaBright,
                        blue: lambdaBright,
                        white: lambdaBright,
                    }
                }]
            }));
        }

        return stack;
    }

}
