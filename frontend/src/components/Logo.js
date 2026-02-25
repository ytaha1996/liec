import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { makeStyles } from 'tss-react/mui';
const PADDING = 10;
function calcPadding(padding) {
    return !isNaN(padding) ? padding : PADDING;
}
const useStyles = makeStyles()((theme, { props }) => ({
    logoContainer: {
        height: props.height - 2 * calcPadding(props.verticalPadding),
        margin: 0,
        padding: `${calcPadding(props.verticalPadding)}px ${calcPadding(props.horizontalPadding)}px`,
    },
    img: {
        width: 'auto',
    },
}));
const Logo = (props) => {
    const { alt, className, id, height, src, width, style, horizontalPadding, verticalPadding, } = props;
    const { classes, cx } = useStyles({ props });
    return (_jsx(_Fragment, { children: _jsx("figure", { className: cx(classes.logoContainer, className), children: _jsx("img", { alt: alt, src: src, id: id, style: style, className: classes.img, height: height - 2 * calcPadding(verticalPadding), width: width - 2 * calcPadding(horizontalPadding) }) }) }));
};
export default Logo;
