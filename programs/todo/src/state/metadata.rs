use anchor_lang::prelude::*;

pub const CHILDREN_LEN: usize = 3;

#[account]
pub struct TreeNode {
    pub bump: u8,
    pub parent_mint: Pubkey,
    pub children_mint: [Option<Pubkey>; CHILDREN_LEN],
    // pub owner: Pubkey
}

impl TreeNode {
    pub fn space() -> usize {
        8 + 1 + 32 + (1 + 32) + (1 + 32) + 3 * (1 + 32)
    }
}
