import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';

registerBlockType('fc-name-your-price/form', {
  edit: Edit,
});
