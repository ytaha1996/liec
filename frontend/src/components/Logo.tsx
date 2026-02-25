import { makeStyles } from 'tss-react/mui';
import React from 'react';

export interface ILogoStyles {
  height: number;
  width: number;
  className?: string;
  horizontalPadding?: number;
  verticalPadding?: number;
  id?: string;
  style?: React.CSSProperties;
}

interface ILogoProps extends ILogoStyles {
  alt: string;
  src: string;
}

const PADDING = 10;

function calcPadding(padding: number | undefined): number {
  return !isNaN(padding as number) ? (padding as number) : PADDING;
}

const useStyles = makeStyles<{ props: ILogoProps }>()((theme, { props }) => ({
  logoContainer: {
    height: props.height - 2 * calcPadding(props.verticalPadding),
    margin: 0,
    padding: `${calcPadding(props.verticalPadding)}px ${calcPadding(
      props.horizontalPadding
    )}px`,
  },
  img: {
    width: 'auto',
  },
}));

const Logo: React.FC<ILogoProps> = (props) => {
  const {
    alt,
    className,
    id,
    height,
    src,
    width,
    style,
    horizontalPadding,
    verticalPadding,
  } = props;
  const { classes, cx } = useStyles({ props });

  return (
    <>
      <figure className={cx(classes.logoContainer, className)}>
        <img
          alt={alt}
          src={src}
          id={id}
          style={style}
          className={classes.img}
          height={height - 2 * calcPadding(verticalPadding)}
          width={width - 2 * calcPadding(horizontalPadding)}
        />
      </figure>
    </>
  );
};

export default Logo;
